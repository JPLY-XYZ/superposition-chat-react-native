import { View, TextInput, TouchableOpacity, Platform } from 'react-native' // Añade Platform
import React, { useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ChatInput = ({ onSend }) => {
  const [message, setMessage] = useState('');
  const insets = useSafeAreaInsets();

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
      <View className="flex-row items-end p-3">
       
        {/* <TouchableOpacity className="mb-3 mr-2">
            <Ionicons name="add" size={28} color="#00FFFF" />   TODO: Boton para adjuntar
        </TouchableOpacity> */}

        <View className="flex-1 flex-row bg-slate-900 border border-slate-800 rounded-2xl items-center px-4 py-1 mr-2">
            <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Escribir mensaje..."
                placeholderTextColor="#64748b"
                multiline
                className="flex-1 text-white text-base max-h-24 pt-3 pb-3" 
                style={{ textAlignVertical: 'center' }}
            />
        </View>

        <TouchableOpacity 
            onPress={handleSend}
            className={`mb-1 p-3 rounded-full ${message.trim().length > 0 ? 'bg-cyan-500' : 'bg-slate-800'}`}
        >
            <Ionicons name="send" size={20} color={message.trim().length > 0 ? "#020617" : "#94a3b8"} />
        </TouchableOpacity>

      </View>
    </View>
  )
}

export default ChatInput