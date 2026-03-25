import { View, TextInput, TouchableOpacity, Text } from 'react-native' // Importa Text de react-native
import React, { useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSocket } from 'context/SocketContext';

const ChatInput = ({ onSend }) => {
  const [message, setMessage] = useState('');
  const insets = useSafeAreaInsets();
  const { online } = useSocket();

  const handleSend = () => {
    if (message.trim().length === 0) return;
    if (onSend) onSend(message);
    setMessage('');
  };

  return (
    <View
      style={{ paddingBottom: insets.bottom }}
      className="bg-slate-950 border-t border-slate-800"
    >
      {/* AVISO DE CONEXIÓN: Centrado y pequeño */}
      {!online && (
        <View className="items-center pt-2">
          <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
            Sin conexión a la red externa
          </Text>
        </View>
      )}

      <View className="flex-row items-end p-3">
        <TouchableOpacity disabled={!online || message.trim().length === 0}
          onPress={handleSend}
          className={`mb-2 mr-2 
            }`}>
          <Ionicons name="add" size={26} color={message.trim().length > 0 && online ? '#22d3ee' : '#647577ff'} />
        </TouchableOpacity>

        <View className="flex-1 flex-row bg-slate-900 border border-slate-800 rounded-2xl items-center px-4 mr-2">
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder={online ? "Escribir mensaje..." : "Esperando conexión..."}
            placeholderTextColor="#475569"
            multiline
            editable={online} // Opcional: desactiva el input si no hay red
            className="flex-1 text-white text-base max-h-24 py-3"
            style={{ textAlignVertical: 'center' }}
          />
        </View>

        <TouchableOpacity
          disabled={!online || message.trim().length === 0}
          onPress={handleSend}
          className={`mb-1 p-3 rounded-full ${message.trim().length > 0 && online ? 'bg-cyan-500' : 'bg-slate-800'
            }`}
        >
          <Ionicons
            name="send"
            size={20}
            color={message.trim().length > 0 && online ? "#0f172a" : "#475569"}
          />
        </TouchableOpacity>
      </View>
    </View>
  )
}

export default ChatInput