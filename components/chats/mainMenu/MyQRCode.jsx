import React from 'react';
import { View, Text } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from 'context/AuthContext';
import { generateRandomString } from 'lib/utils';

const MyQRCode = () => {
  const { user } = useAuth();

  if (!user?.id) return null;

  const ramdomString = generateRandomString(40);

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

      {/* INFORMACIÓN DE TEXTO */}
      {/* <View className="mt-8 items-center w-full">
        <Text className="text-gray-500 text-[10px] uppercase tracking-widest mb-2 font-semibold">
          Identificador de Onda
        </Text>
         */}
      {/* Caja del ID estilo terminal */}
      {/* <View className="bg-[#0A0E1A] px-4 py-2 rounded-lg border border-gray-700/50 w-full">
            <Text 
                className="text-white font-mono text-center text-xs font-bold tracking-wider" 
                numberOfLines={1} 
                ellipsizeMode="middle"
            >
            {user.id}
            </Text>
        </View> */}

      {/* {user.username && (
            <Text className="text-cyan-600 mt-4 font-bold text-lg tracking-wide">
                @{user.username}
            </Text>
        )}
      </View> */}

    </View>
  );
}

export default MyQRCode;