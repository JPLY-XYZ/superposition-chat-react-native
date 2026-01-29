import React, { useEffect, useState } from "react";
import { View, Text, Image, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "context/AuthContext";
import { useSocket } from "context/SocketContext";
import MyQRCode from "components/chats/mainMenu/MyQRCode";
import GlitchText from "components/glicthText";
import { getSystemStats } from "lib/database/db";

export default function Profile() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { online } = useSocket();
  const [stats, setStats] = useState(null);
  const [isFirma, setIsFirma] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      const data = await getSystemStats();
      console.log(data);
      setStats(data);
    };
    loadStats();
  }, []);

  return (
    <View
      className="flex-1 bg-[#0A0E1A] p-8"
    >

      {/* 1. Header Técnico */}
      <View className="mt-6 mb-10 flex-row justify-between items-end">
        <View>
          <Text className="text-cyan-500/50 text-[10px] font-mono tracking-[3px] mb-1">
            SISTEMA_DE_IDENTIDAD
          </Text>
          <GlitchText isError={!online}>ESTADO_SUJETO</GlitchText>
        </View>
        <View className="items-end">
          <Text className="text-slate-600 text-[10px] font-mono">FASE_SYNC</Text>
          <Text className={`font-bold ${online ? 'text-cyan-500' : 'text-[#FF00FF]'}`}>
            {online ? 'ESTABLE' : 'ERROR_RED'}
          </Text>
        </View>
      </View>

      {/* 2. Avatar con Aura de Energía */}
      <View className="items-center mb-8 ">
        <View
          style={{
            shadowColor: online ? '#00FFFF' : '#FF00FF',
            shadowOpacity: 0.4,
            shadowRadius: 20
          }}

        >
          <Image
            source={{ uri: user?.imageUrl }}
            className="w-44 h-44 rounded-full bg-[#0D1526]"
          />
          {/* Indicador de estado estilizado */}
          <View
            className={`absolute bottom-2 right-4 w-8 h-8 rounded-full border-4 border-[#0A0E1A] ${online ? 'bg-cyan-500' : 'bg-[#FF00FF]'}`}
          />
        </View>

        <Text className="text-white text-3xl font-black mt-6 tracking-tight">
          {user?.displayName.toUpperCase()}
        </Text>
        <Text className="text-slate-500 font-mono text-xs mt-1">
          UUID: {user?.id?.substring(0, 12).toUpperCase()}...
        </Text>
      </View>

      <View>
        {/* Selector de Fase (Botón de intercambio) */}

<View className="flex-row bg-[#0A0E1A] p-1 rounded-2xl border border-slate-800 mb-4">
    <TouchableOpacity 
      onPress={() => setIsFirma(true)}
      className={`flex-1 py-2 rounded-xl ${isFirma ? 'bg-cyan-500' : ''}`}
    >
      <Text className={`text-center font-bold text-xs ${isFirma ? 'text-slate-950' : 'text-slate-500'}`}>
        FIRMA
      </Text>
    </TouchableOpacity>
    <TouchableOpacity 
      onPress={() => setIsFirma(false)}
      className={`flex-1 py-2 rounded-xl ${!isFirma ? 'bg-[#FF00FF]' : ''}`}
    >
      <Text className={`text-center font-bold text-xs ${!isFirma ? 'text-slate-950' : 'text-slate-500'}`}>
        STATS
      </Text>
    </TouchableOpacity>
  </View>
        {/* Contenedor Dinámico */}

        {isFirma ? (
          /* VISTA A: Firma Digital QR */
          <MyQRCode />
        ) : (
          /* VISTA B: Panel de Control de Datos */
          <View>
            <Text className="text-cyan-500/50 text-[10px] font-mono tracking-[2px] mb-6 uppercase">
              Panel_Control_Datos
            </Text>

            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-slate-400 font-mono text-xs">Total Conversaciones</Text>
              <Text className="text-white font-bold text-lg">{stats?.numChats || 0}</Text>
            </View>

            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-slate-400 font-mono text-xs">Contactos Registrados</Text>
              <Text className="text-cyan-500 font-bold text-lg">{stats?.numContacts || 0}</Text>
            </View>

            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-slate-400 font-mono text-xs">Mensajes en Bucle</Text>
              <Text className="text-[#FF00FF] font-bold text-lg">{stats?.numUnsynced || 0}</Text>
            </View>

            <View className="flex-row justify-between items-center">
              <Text className="text-slate-400 font-mono text-xs">Total Mensajes</Text>
              <Text className="text-white font-bold text-lg">{stats?.totalMessages || 0}</Text>
            </View>
          </View>
        )}

      </View>




      {/* 4. Acciones de Sistema */}
      <View className="gap-4 mt-auto">
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => logout()}
          className="flex-row items-center justify-center bg-red-500/10 p-5 rounded-2xl border border-red-500/30"
        >
          <Text className="text-red-500 font-black tracking-[2px] uppercase">
            Desvincular Fase
          </Text>
        </TouchableOpacity>
      </View>

      {/* 5. Footer de Versión */}
      <View className="mt-12 items-center opacity-30">
        <Text className="text-slate-400 text-[10px] font-mono tracking-widest">
          PROTOCOL: SUPERPOSITION_CHAT
        </Text>
        <Text className="text-slate-400 text-[10px] font-mono mt-1">
          BUILD_HASH: JPLY-XYZ-2026
        </Text>
      </View>

    </View>
  );
}