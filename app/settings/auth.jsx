import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Componentes locales
import LoginComponent from 'components/auth/LoginComponent';
import SingUpComponent from 'components/auth/SingUpComponent';
import GlitchText from 'components/glicthText';
import PhaseSelector from 'components/PhaseSelector';

// --- IMPORTAMOS TUS FUNCIONES ---
import { getSettings, saveSettings } from "lib/auth/storage";

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);

  // --- ESTADOS DEL SERVIDOR ---
  const [serverModalVisible, setServerModalVisible] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('idle');

  const abortControllerRef = useRef(null);
  const timeoutRef = useRef(null);

  // 1. AUTOCHECK: Ahora usa tu función getSettings()
  useEffect(() => {
    const checkConfig = async () => {
      const settings = await getSettings();

      // Usamos WS_URL que es lo que devuelve tu función
      if (settings.WS_URL) {
        setBaseUrl(settings.WS_URL);
        // Disparamos la comprobación automática
        handleConnectionAction(settings.WS_URL, false);
      } else {
        setIsConfigured(false);
        setConnectionStatus('idle');
      }
    };
    checkConfig();
  }, [serverModalVisible]);

  const clearTimers = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (abortControllerRef.current) abortControllerRef.current.abort();
  };

  const handleConnectionAction = async (urlOverride = null, isManualAction = true) => {
    const urlToTest = urlOverride || baseUrl;
    if (connectionStatus === 'testing' && !urlOverride) return;
    if (!urlToTest.trim()) {
      setIsConfigured(false);
      return;
    }

    setConnectionStatus('testing');
    clearTimers();
    abortControllerRef.current = new AbortController();

    timeoutRef.current = setTimeout(() => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      setConnectionStatus('timeout');
      setIsConfigured(false);
      setTimeout(() => setConnectionStatus('idle'), 3000);
    }, 15000);

    try {
      const cleanUrl = urlToTest.trim().replace(/\/$/, "");
      const response = await fetch(`${cleanUrl}/api/status`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: abortControllerRef.current.signal
      });

      const data = await response.json();

      if (data?.status === "health") {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        // --- GUARDADO USANDO TU FUNCIÓN saveSettings ---
        // Recuperamos lo que haya para no pisar MODE o NOTIFICATIONS
        const currentSettings = await getSettings();
        await saveSettings({
          ...currentSettings,
          API_URL: `${cleanUrl}/api`,
          WS_URL: cleanUrl
        });

        setIsConfigured(true);

        if (isManualAction) {
          setConnectionStatus('success');
          setTimeout(() => setServerModalVisible(false), 800);
        } else {
          setConnectionStatus('auto-success');
        }
      } else {
        throw new Error();
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setConnectionStatus('timeout');
        setIsConfigured(false);
        setTimeout(() => setConnectionStatus('idle'), 3000);
      }
    }
  };

  const getModalStyles = () => {
    switch (connectionStatus) {
      case 'success': return { hex: '#00FFFF', bg: 'bg-[#00FFFF]', border: 'border-[#00FFFF]', text: 'SINCRONIZADO' };
      case 'auto-success': return { hex: '#A855F7', bg: 'bg-[#A855F7]', border: 'border-[#A855F7]', text: 'RECONFIGURAR' };
      case 'timeout': return { hex: '#FF0000', bg: 'bg-[#FF0000]', border: 'border-[#FF0000]', text: 'ERROR_NODO' };
      default: return { hex: '#FF8C00', bg: 'bg-[#FF8C00]', border: 'border-[#FF8C00]', text: 'PROBAR CONEXIÓN' };
    }
  };

  const mStyle = getModalStyles();
  const outerAccent = isConfigured ? '#00FFFF' : '#FF8C00';
  const isConnected = (connectionStatus === 'success' || connectionStatus === 'auto-success') && isConfigured;

  return (
    <View className="flex-1 justify-center p-8 bg-[#0A0E1A]">
      <Modal visible={serverModalVisible} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 justify-center items-center bg-[#020617]/99 px-8"
        >
          <View
            style={{ shadowColor: mStyle.hex, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 20, width: '100%' }}
            className={`bg-[#0A0E1A] p-8 rounded-[32px] border-[1.5px] ${mStyle.border} items-stretch`}
          >
            <View className="flex-row items-center mb-10 mx-auto">
              <GlitchText>CONFIG_NODO</GlitchText>
            </View>

            <View className="w-full mb-6">
              <Text className="text-slate-500 text-[10px] uppercase font-bold tracking-[2px] mb-2 px-1">Host_Address</Text>
              <TextInput
                value={baseUrl}
                onChangeText={(text) => {
                  setBaseUrl(text);
                  setConnectionStatus('idle');
                }}
                placeholder="http://192.168.1.XX:3000"
                placeholderTextColor="#1E293B"
                selectionColor={mStyle.hex}
                autoCapitalize="none"
                editable={connectionStatus === 'idle'}
                style={{ width: '100%' }}
                className={`bg-[#0D1526] text-white p-5 rounded-2xl border ${mStyle.border} font-mono text-sm ${connectionStatus !== 'idle' ? 'opacity-40' : ''}`}
              />
            </View>

            <TouchableOpacity
              onPress={() => {
                if (connectionStatus === 'auto-success') {
                  setConnectionStatus('idle');
                  setIsConfigured(false);
                } else {
                  handleConnectionAction(null, true);
                }
              }}
              disabled={connectionStatus === 'testing' || connectionStatus === 'success' || connectionStatus === 'timeout'}
              className={`w-full h-[60px] rounded-2xl items-center justify-center mb-6 ${mStyle.bg}`}
              activeOpacity={0.8}
            >
              {connectionStatus === 'testing' ? (
                <ActivityIndicator size="small" color="#0A0E1A" />
              ) : connectionStatus === 'timeout' ? (
                <Ionicons name="close" size={24} color="#0A0E1A" />
              ) : (
                <Text className="text-[#0A0E1A] font-black tracking-widest text-[10px]">{mStyle.text}</Text>
              )}
            </TouchableOpacity>

            {connectionStatus !== 'success' && connectionStatus !== 'testing' && (
              <TouchableOpacity onPress={() => setServerModalVisible(false)} >
                <Text className="text-slate-600 font-bold uppercase text-[10px] self-end tracking-widest">Cerrar Panel</Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <View className="mb-12 items-center">
        <GlitchText>SUPERPOSITION CHAT</GlitchText>
      </View>

      <View
        style={{ shadowColor: isLogin ? '#00FFFF' : '#FF00FF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.2, shadowRadius: 20 }}
        className={`p-6 rounded-3xl border-[1px] bg-[#0A0E1A] ${isLogin ? 'border-cyan-500/30' : 'border-[#FF00FF]/30'}`}
      >
        <View>
          {isLogin ? <LoginComponent usable={isConnected} /> : <SingUpComponent usable={isConnected} />}
        </View>
      </View>

      <View className="mt-8">
        <PhaseSelector isLogin={isLogin} onChange={setIsLogin} />
      </View>

      <TouchableOpacity
        onPress={() => setServerModalVisible(true)}
        style={{ position: 'absolute', top: 50, right: 20, zIndex: 50, padding: 10, borderRadius: 20, backgroundColor: `${outerAccent}15`, borderWidth: 1, borderColor: `${outerAccent}30` }}
      >
        <Ionicons name="settings-outline" size={22} color={outerAccent} />
      </TouchableOpacity>
    </View>
  );
}