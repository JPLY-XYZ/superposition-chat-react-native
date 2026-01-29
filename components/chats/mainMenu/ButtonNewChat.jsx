import { View, TouchableOpacity } from 'react-native'
import React from 'react'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router';

const ButtonNewChat = () => {
  const router = useRouter();
  return (
    <View className="absolute bottom-4 right-4">
      <TouchableOpacity onPress={() => router.push('/chat/newChat')} className="bg-blue-500 p-2 rounded-full">
        <Ionicons name="add" size={40} color="white" />
      </TouchableOpacity>
    </View>
  )
}

export default ButtonNewChat