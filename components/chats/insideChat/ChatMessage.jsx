import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { View, Text, Image, TouchableOpacity, Modal } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useAuth } from 'context/AuthContext';
import { FontAwesome5, FontAwesome6, Ionicons } from '@expo/vector-icons';
import GlitchStatusIcon from 'components/GlitchStatusIcon';
import { Audio } from 'expo-av';
import { Waveform } from './WaveForm';

const ChatMessage = ({ message }) => {
  const { user } = useAuth();
  const isOwnMessage = message?.senderId === user?.id;

  // --- ESTADOS PARA EL AUDIO ---
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [isImageVisible, setIsImageVisible] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const initAudio = async () => {
      if (message.type === 'audio' && message.content) {
        try {
          const { sound: newSound, status } = await Audio.Sound.createAsync(
            { uri: message.content },
            { shouldPlay: false } // Lo cargamos pero NO lo reproducimos
          );

          if (isMounted) {
            setSound(newSound);
            setDuration(status.durationMillis || 0);
            newSound.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
          } else {
            newSound.unloadAsync(); // Si el usuario hace scroll rápido, liberamos memoria
          }
        } catch (error) {
          console.error("Error pre-cargando audio:", error);
        }
      }
    };

    initAudio();

    return () => {
      isMounted = false;
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []); // Se ejecuta al montar la burbuja

  // Limpiar el audio de la memoria si el componente se desmonta (al hacer scroll)
  useEffect(() => {
    return () => {
      if (sound) sound.unloadAsync();
    };
  }, [sound]);

  const handleDownloadFile = async () => {
    try {
      const fileUri = FileSystem.documentDirectory + (message.fileName || 'archivo_descargado');

      // Descargar el archivo
      const { uri } = await FileSystem.downloadAsync(message.content, fileUri);

      // Abrir menú para guardar o compartir
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      }
    } catch (error) {
      console.error("Error al descargar:", error);
    }
  };

  const formatTime = (millis) => {
    if (!millis) return '00:00';
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };
  // --- LÓGICA DEL REPRODUCTOR DE AUDIO ---
  const handlePlayPause = async () => {
    try {
      if (!sound) return; // Si aún no ha cargado, no hacemos nada

      if (isPlaying) {
        await sound.pauseAsync();
      } else {
        // Si ya había terminado de sonar, lo reiniciamos desde el principio
        if (position >= duration && duration > 0) {
          await sound.replayAsync();
        } else {
          await sound.playAsync(); // Lo reproduce desde donde se pausó
        }
      }
    } catch (error) {
      console.error("Error reproduciendo audio:", error);
    }
  };

  const onPlaybackStatusUpdate = (status) => {
    if (status.isLoaded) {
      setDuration(status.durationMillis || 0);
      setPosition(status.positionMillis || 0);
      setIsPlaying(status.isPlaying);
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(status.durationMillis); // Dejar la barra al final
      }
    }
  };

  const fileExtension = message.content.includes('.')
    ? message.content.split('.').pop().toUpperCase()
    : 'ARCHIVO';

  // --- RENDERIZADO CONDICIONAL DEL CONTENIDO ---
  const renderContent = () => {
    switch (message.type) {
      case 'image':
        return (
          <>
            <TouchableOpacity onPress={() => setIsImageVisible(true)}>
              <Image
                source={{ uri: message.content }}
                style={{ width: 220, height: 220 }}
                className="rounded-xl mb-2"
                resizeMode="cover"
              />
            </TouchableOpacity>

            {/* MODAL PARA VISTA EN GRANDE */}
            <Modal
              visible={isImageVisible}
            >
              <View
                className="flex-1 bg-black justify-center items-center"

              >
                {/* Botón de cerrar (opcional) */}
                <TouchableOpacity
                  className="absolute top-12 right-6 z-10 p-2 bg-slate-800 rounded-full"
                  onPress={() => setIsImageVisible(false)}
                >
                  <Ionicons name="close" size={28} color="white" />
                </TouchableOpacity>

                <Image
                  source={{ uri: message.content }}
                  className="w-full h-[70%]"
                  resizeMode="contain"
                />
              </View>
            </Modal>
          </>
        );

      case 'audio':
        // Calculamos el tiempo restante. 
        // Math.max(0, ...) evita que salgan números negativos por milisegundos de desfase al terminar.
        const timeRemaining = Math.max(0, duration - position);

        return (
          <View className="flex-row items-center min-w-[200px] mb-1">
            <TouchableOpacity onPress={handlePlayPause} className="mr-2">
              <Ionicons name={isPlaying ? "pause" : "play"} size={28} color="#22d3ee" />
            </TouchableOpacity>

            <View className="flex-1 overflow-hidden mx-1">
              <Waveform count={20} isStatic={!isPlaying} />
            </View>

            <Text className="text-slate-300 text-[11px] font-mono ml-2">
              {formatTime(timeRemaining)}
            </Text>
          </View>
        );

      case 'text':
      default:
        return (
          <Text className="text-white text-base leading-6 mb-1">
            {message.content}
          </Text>
        );

      case 'file':
        return (
          <TouchableOpacity
            onPress={handleDownloadFile}
            className="flex-row items-center bg-slate-700/50 p-3 rounded-lg border border-slate-600 min-w-[200px]"
          >
            <Ionicons name="document-attach" size={24} color="#22d3ee" />

            <View className="ml-3 flex-1">
              <Text className="text-white font-medium text-sm">
                Documento
              </Text>
              <Text className="text-slate-400 text-xs mt-0.5 font-mono">
                {fileExtension}
              </Text>
            </View>

            <Ionicons name="download-outline" size={20} color="gray" />
          </TouchableOpacity>
        );
    }
  };

  // --- ICONOS DE ESTADO ---
  const getBubbleStyle = () => {
    if (!isOwnMessage || message.type == "info") return null;

    switch (message.status) {
      case 'superposed': return <GlitchStatusIcon />;
      case 'pending': return <FontAwesome6 name="clock" size={12} color="gray" />;
      case 'sent': return <FontAwesome5 name="check" size={12} color="gray" />;
      case 'received': return <FontAwesome5 name="check-double" size={12} color="gray" />;
      case 'read': return <FontAwesome5 name="check-double" size={12} color="#22d3ee" />;
    }
  };

  // --- FECHA Y HORA ---
  const msgDate = new Date(message.createdAt);
  const isToday = new Date().toDateString() === msgDate.toDateString();
  const timeString = isToday
    ? msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : msgDate.toLocaleString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  // --- MENSAJE TIPO INFO ---
  if (message.type == "info") {
    return (
      <View className="items-center my-4 px-10">
        <View className="bg-slate-900/50 px-4 py-1.5 rounded-full border border-slate-800">
          <Text className="text-slate-400 text-[11px] text-center italic leading-4">
            {message.content}
          </Text>
        </View>
      </View>
    );
  }

  // --- BURBUJA PRINCIPAL ---
  return (
    <View className={`flex-row mb-3 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      {/* Corrección del redondeo: si es propio, la esquina recta es la superior derecha */}
      <View className={`max-w-[80%] px-4 py-3 rounded-2xl shadow-sm bg-slate-800 border border-slate-700 ${isOwnMessage ? 'rounded-tr-none' : 'rounded-tl-none'}`}>

        {renderContent()}

        <View className="flex-row items-center justify-end gap-1.5 mt-0.5">
          <Text className={`text-[10px] ${isOwnMessage ? 'text-cyan-400/80' : 'text-slate-400'}`}>
            {timeString}
          </Text>
          {getBubbleStyle()}
        </View>
      </View>
    </View>
  );
};

export default ChatMessage;