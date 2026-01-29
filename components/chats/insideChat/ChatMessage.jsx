import { View, Text } from 'react-native'
import React from 'react'
import { useAuth } from 'context/AuthContext';
import { FontAwesome5, FontAwesome6} from '@expo/vector-icons';
import GlitchStatusIcon from 'components/GlitchStatusIcon';

const ChatMessage = ({ message }) => {

  const { user } = useAuth();
  // Determinamos si es mío basándonos en el ID simulado 'me'
  const isOwnMessage = message?.senderId === user?.id;

  const getBubbleStyle = () => {
    if (!isOwnMessage) {
      return ;
    }

    // 2. Si es MI mensaje, estilo según el status
    switch (message.status) {
      case 'superposed':
        // PENDIENTE DE ENVIAR: Borde Gris
        return <GlitchStatusIcon />;
      case 'pending':
        // PENDIENTE DE ENVIAR: Borde Gris
        return <FontAwesome6 name="clock" size={14} color="gray" />;
      case 'sent':
        // ENVIADO AL SERVIDOR: Borde Cian
        return <FontAwesome5 name="check" size={14} color="gray" />;
      case 'received':
        // RECIBIDO POR EL OTRO USUARIO: Borde naranja
        return <FontAwesome5 name="check-double" size={14} color="gray" />;
      case 'read':
        // LEÍDO POR EL OTRO USUARIO: Borde Verde
        return <FontAwesome5 name="check-double" size={14} color="cyan" />;
    }
  };

  const msgDate = new Date(message.createdAt);
  const isToday = new Date().toDateString() === msgDate.toDateString();

  const timeString = isToday
    ? msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) // Ej: 14:30
    : msgDate.toLocaleString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); // Ej: 16/01 14:30

  return (
    <View onPress={() => console.log(message)} className={`flex-row mb-3 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      <View className={`max-w-[80%] px-4 py-3 rounded-2xl shadow-sm bg-slate-800 border border-slate-700 rounded-tl-none`}>
        <Text className="text-white text-base leading-6">
          {message.content}
        </Text>
        <View className="flex-row items-center gap-2">  
        <Text
          className={`text-[10px] mt-1 flex-row items-center gap-2 text-right ${isOwnMessage ? 'text-cyan-400' : 'text-slate-400'}`}
        >
          {timeString} 
        </Text>
        {getBubbleStyle()}
        </View>
      </View>
    </View>
  )
}

export default ChatMessage