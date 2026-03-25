import React from 'react';
import { View, Text, TouchableOpacity, ToastAndroid, Platform, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from 'context/AuthContext';
import { generateRandomString } from 'lib/utils';
import { Ionicons } from '@expo/vector-icons'

const MyQRCode = () => {
  const { user } = useAuth();

  if (!user?.id) return null;

  const ramdomString = generateRandomString(40);

  const copyToClipboard = async () => {
    if (user?.code) {
      await Clipboard.setStringAsync(user.code);

      // Lógica de Toast Nativo
      if (Platform.OS === 'android') {
        ToastAndroid.showWithGravity(
          "Código copiado",
          ToastAndroid.SHORT,
          ToastAndroid.CENTER
        );
      } else {
        // iOS no tiene Toast nativo, se suele usar un Alert simple 
        // o puedes omitirlo si prefieres una respuesta visual custom
        console.log("Copiado en iOS");
      }
    }
  };

  return (
    <View className="items-center justify-center ">

      {/* TÍTULO */}
      <Text className="text-cyan-400 text-xs font-extrabold tracking-[3px] uppercase mb-8 opacity-90">
        Enlace Cuántico Personal
      </Text>

      {/* CONTENEDOR DEL QR (NÚCLEO) */}
      <View className="relative mb-8">

        {/* Efecto de Glow/Resplandor detrás del QR */}


        {/* Marco Principal */}
        <View className="p-4 bg-white rounded-2xl border-2 border-cyan-500 ">
          <QRCode
            value={"user:" + user?.code + ':' + ramdomString}          // El dato a escanear
            size={120}              // Tamaño generoso
            color="#0A0E1A"         // Puntos color Azul Noche (el fondo de tu app)
            backgroundColor="white" // Fondo blanco para máximo contraste
          />


        </View>

        {/* DECORACIÓN TECH (ESQUINAS FLOTANTES) */}
        {/* Arriba Izquierda */}
        <View className="absolute -top-3 -left-3 w-8 h-8 border-t-4 border-l-4 border-cyan-400 rounded-tl-xl" />
        {/* Arriba Derecha */}
        <View className="absolute -top-3 -right-3 w-8 h-8 border-t-4 border-r-4 border-cyan-400 rounded-tr-xl" />
        {/* Abajo Izquierda */}
        <View className="absolute -bottom-3 -left-3 w-8 h-8 border-b-4 border-l-4 border-cyan-400 rounded-bl-xl" />
        {/* Abajo Derecha */}
        <View className="absolute -bottom-3 -right-3 w-8 h-8 border-b-4 border-r-4 border-cyan-400 rounded-br-xl" />

      </View>

      <TouchableOpacity
        onPress={copyToClipboard}
        activeOpacity={0.7}
        className="flex-row items-center justify-center mb-8 bg-slate-800/50 py-3 px-6 rounded-2xl border border-slate-700 shadow-lg"
      >
        <Text className='text-xl text-white font-extrabold tracking-[3px] uppercase opacity-90 mr-4'>
          {user?.code}
        </Text>

        <Ionicons name="copy" size={20} color="#22d3ee" strokeWidth={2.5} />
      </TouchableOpacity>

    </View>
  );
}

export default MyQRCode;