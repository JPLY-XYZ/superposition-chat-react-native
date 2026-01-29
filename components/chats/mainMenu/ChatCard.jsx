import { View, Text, Image, TouchableOpacity } from 'react-native'
import React from 'react'
import { router } from 'expo-router';
import { useSocket } from 'context/SocketContext';
import { useAuth } from 'context/AuthContext';


const ChatCard = ({ chat }) => {

    if (!chat) return null;
    const { onlineUserIds } = useSocket();
    const { user } = useAuth();
    const isOnline = onlineUserIds.has(chat?.participants.find(participant => participant !== user?.id));

    //navega a la pantalla del chat al pulsar el chat
    const HandleNavigateToChat = async () => {
        router.push({ pathname: '/chat/[id]', params: { id: chat?.id } });
    };

    return (
        <TouchableOpacity
            onPress={() => HandleNavigateToChat()}
            activeOpacity={0.7}
            className="flex-row items-center p-4 bg-slate-900 border-b border-slate-800">

            <Image
                source={{ uri: "https://api.dicebear.com/9.x/bottts/png?seed=" + chat?.participants?.find(participant => participant !== user?.id) }}
                className={`w-12 h-12 rounded-full mr-4 border ${isOnline ? 'border-cyan-200' : 'border-slate-800'}`}
                resizeMode="cover"
            />

            <View className="flex-1">
                <View className="flex-row justify-between items-center mb-1">
                    <Text className="text-white font-bold text-lg">
                        {chat.name?.toUpperCase()}
                    </Text>
                    <Text className="text-slate-500 text-xs">
                        {chat.updatedAt
                            ? new Date(chat.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : ''}
                    </Text>
                </View>

                <View className="flex-row justify-between items-center">
                    <Text className="text-slate-400 text-sm flex-1 mr-2" numberOfLines={1}>
                        {chat?.lastMessageText}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    )
}

export default ChatCard