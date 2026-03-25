import { View, TextInput, TouchableOpacity, Text } from 'react-native'
import React, { useState, useRef, useEffect } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSocket } from 'context/SocketContext';
import { useAuth } from 'context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { uploadFileToServer } from 'services/uploadService';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
import { Waveform } from './WaveForm';

const ChatInput = ({ onSend }) => {
  const [message, setMessage] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUri, setRecordedUri] = useState(null);
  const [recordingTime, setRecordingTime] = useState('00:00');
  const [isPlaying, setIsPlaying] = useState(false);
  const [dbLevels, setDbLevels] = useState([]); // Para la onda real
  const [isSaved, setIsSaved] = useState(false); // Para la onda real

  const recordingRef = useRef(null);
  const timerRef = useRef(null);
  const soundRef = useRef(null);

  const insets = useSafeAreaInsets();
  const { online } = useSocket();
  const { token } = useAuth();

  // Limpiar recursos al cerrar
  useEffect(() => {
    return () => {
      if (soundRef.current) soundRef.current.unloadAsync();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // --- 1. FUNCIÓN QUE FALTABA: REPRODUCIR ANTES DE ENVIAR ---
  const playRecordedAudio = async () => {
    try {
      if (isPlaying) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
        return;
      }

      if (soundRef.current) {
        await soundRef.current.replayAsync();
      } else {
        const { sound } = await Audio.Sound.createAsync(
          { uri: recordedUri },
          { shouldPlay: true }
        );
        soundRef.current = sound;
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.didJustFinish) setIsPlaying(false);
        });
      }
      setIsPlaying(true);
    } catch (err) {
      console.error("Error al reproducir:", err);
    }
  };

  // --- 2. LÓGICA DE GRABACIÓN CON ONDA REAL ---
  const startRecording = async () => {
    try {
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync().catch(() => { });
      }

      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') return;

      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });

      // Configuración crítica para el Metering
      const { recording } = await Audio.Recording.createAsync(
        {
          isMeteringEnabled: true,
          android: {
            extension: '.m4a',
            outputFormat: Audio.AndroidOutputFormat.MPEG_4,
            audioEncoder: Audio.AndroidAudioEncoder.AAC,
            sampleRate: 44100,
            numberOfChannels: 2,
            bitRate: 128000,
          },
          ios: {
            extension: '.m4a',
            audioQuality: Audio.IOSAudioQuality.HIGH,
            sampleRate: 44100,
            numberOfChannels: 2,
            bitRate: 128000,
            linearPCMBitDepth: 16,
          },
        },
        (status) => {
          if (status.metering !== undefined && status.isRecording) {
            // Normalizar de -160dB a un alto de barra (0 a 35)
            const level = Math.max(3, (status.metering + 160) / 4.5);
            setDbLevels((prev) => [...prev.slice(-35), level]);
          }
        },
        100 // Actualizar cada 100ms
      );

      recordingRef.current = recording;
      setIsRecording(true);
      setRecordedUri(null);
      setDbLevels([]);

      let seconds = 0;
      timerRef.current = setInterval(() => {
        seconds++;
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        setRecordingTime(`${mins}:${secs}`);
      }, 1000);

    } catch (err) {
      console.error("Error startRecording:", err);
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current || !isRecording) return;

    try {
      clearInterval(timerRef.current);
      setIsRecording(false);
      setIsSaved(false); // 1. Bloqueamos el botón desde el principio

      const status = await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (status.durationMillis < 1000) {
        setRecordedUri(null);
        setRecordingTime('00:00');
        setDbLevels([]);
        return;
      }

      setRecordedUri(uri);

      // 2. Liberamos el botón de enviar tras 1 segundo
      setTimeout(() => {
        setIsSaved(true);
      }, 1000);

    } catch (err) {
      console.error("Error stopRecording:", err);
      setIsRecording(false);
    }
  };

  const deleteRecording = async () => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    setRecordedUri(null);
    setRecordingTime('00:00');
    setIsPlaying(false);
    setDbLevels([]);
  };

  const sendAudio = async () => {
    if (!recordedUri) return;
    const serverUrl = await uploadFileToServer(recordedUri, token);
    if (serverUrl && onSend) {
      onSend(serverUrl, 'audio');
      deleteRecording();
    }
  };

  // --- LÓGICA DE TEXTO E IMÁGENES (RESTAURADA) ---
  const handleSend = () => {
    if (message.trim().length === 0) return;
    if (onSend) onSend(message, 'text');
    setMessage('');
  };

  const uploadAndSend = async (uri, type = 'image') => {
    setShowMenu(false);
    const serverUrl = await uploadFileToServer(uri, token);
    if (serverUrl && onSend) {
      onSend(serverUrl, type);
    }
  };

  const openDocumentScanner = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "*/*" });
      if (!result.canceled) {
        uploadAndSend(result.assets[0].uri, 'file');
      }
    } catch (err) { console.error(err); }
  };

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.6 });
    if (!result.canceled) uploadAndSend(result.assets[0].uri, 'image');
  };

  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: false, quality: 0.6 });
    if (!result.canceled) uploadAndSend(result.assets[0].uri, 'image');
  };

  return (
    <View style={{ paddingBottom: insets.bottom }} className="bg-slate-950 border-t border-slate-900">

      {/* MENÚ FLOTANTE RESTAURADO */}
      {showMenu && !isRecording && !recordedUri && (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 24,
          }}
        >
          <TouchableOpacity onPress={openCamera} className="items-center">
            <View className="bg-pink-600 p-4 rounded-full mb-1"><Ionicons name="camera" size={24} color="white" /></View>
            <Text className="text-slate-400 text-[10px] font-bold uppercase">Cámara</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={openGallery} className="items-center">
            <View className="bg-purple-600 p-4 rounded-full mb-1"><Ionicons name="images" size={24} color="white" /></View>
            <Text className="text-slate-400 text-[10px] font-bold uppercase">Galería</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => { setShowMenu(false); openDocumentScanner(); }} className="items-center">
            <View className="bg-blue-600 p-4 rounded-full mb-1"><Ionicons name="document-text" size={24} color="white" /></View>
            <Text className="text-slate-400 text-[10px] font-bold uppercase">Doc</Text>
          </TouchableOpacity>
        </View>
      )
      }

      {/* AVISO DE CONEXIÓN */}
      {
        !online && (
          <View className="items-center pt-2">
            <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Sin conexión</Text>
          </View>
        )
      }

      <View className="flex-row items-end p-3">

        {isRecording ? (
          <View className="flex-1 flex-row bg-slate-900 border border-red-900/30 rounded-2xl items-center px-4 min-h-[50px] mr-2">
            <Ionicons name="mic" size={20} color="#ef4444" />
            <Text className="text-white font-mono text-base mx-2">{recordingTime}</Text>
            <View className="flex-1">
              <Waveform levels={dbLevels} isStatic={false} />
            </View>
          </View>
        ) : recordedUri ? (
          <View className="flex-1 flex-row bg-slate-900 border border-slate-800 rounded-2xl items-center px-4 min-h-[50px] mr-2">
            <TouchableOpacity onPress={deleteRecording} className="mr-2">
              <Ionicons name="trash-outline" size={22} color="#ef4444" />
            </TouchableOpacity>
            <TouchableOpacity onPress={playRecordedAudio} className="mx-1">
              <Ionicons name={isPlaying ? "pause" : "play"} size={26} color="#22d3ee" />
            </TouchableOpacity>
            <View className="flex-1 opacity-60">
              <Waveform count={34} isStatic={!isPlaying} />
            </View>
            <Text className="text-slate-400 text-[11px] font-mono ml-3 mr-3">
              {recordingTime}
            </Text>
            <TouchableOpacity
              disabled={!isSaved}
              onPress={sendAudio}
              className={`p-2 rounded-full ml-2 ${isSaved ? 'bg-cyan-500' : 'bg-slate-700'}`}
            >
              <Ionicons name="send" size={18} color={isSaved ? "#0f172a" : "#475569"} />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <TouchableOpacity disabled={!online} onPress={() => setShowMenu(!showMenu)} className="mb-2 mr-2">
              <Ionicons name={showMenu ? "close-circle" : "add-circle-outline"} size={32} color={online ? '#22d3ee' : '#475569'} />
            </TouchableOpacity>
            <View className={`flex-1 border rounded-2xl px-4 min-h-[50px] justify-center mr-2 bg-slate-900 border-slate-800'}`}>
              <TextInput
                value={message}
                // ESTA ES LA PROPIEDAD CORRECTA
                editable={online}
                onChangeText={setMessage}
                placeholder={online ? "Mensaje..." : "Sin conexión..."}
                placeholderTextColor={online ? "#475569" : "#334155"}
                multiline
                className={`text-base py-2 ${online ? 'text-white' : 'text-slate-600'}`}
              />
            </View>
          </>
        )}

        {!recordedUri && (
          <TouchableOpacity
            // 1. Bloquea la interacción física
            disabled={!online}
            onLongPress={startRecording}
            onPressOut={stopRecording}
            onPress={message.trim().length > 0 ? handleSend : null}
            // 2. Cambiamos la clase del fondo según el estado
            className={`mb-1 p-3 rounded-full ${!online
              ? 'bg-slate-900' // Color bloqueado (más oscuro)
              : message.trim().length > 0
                ? 'bg-cyan-500'
                : isRecording
                  ? 'bg-red-500'
                  : 'bg-slate-800'
              }`}
          >
            <Ionicons
              name={message.trim().length > 0 ? "send" : isRecording ? "mic" : "mic-outline"}
              size={message.trim().length > 0 ? 20 : 24}
              // 3. El color del icono también debe cambiar si está offline
              color={
                !online
                  ? '#475569' // Gris apagado (slate-600)
                  : (message.trim().length > 0 || isRecording ? "#0f172a" : "#22d3ee")
              }
            />
          </TouchableOpacity>
        )}
      </View>
    </View >
  );
}

export default ChatInput;