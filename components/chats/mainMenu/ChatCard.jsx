import { View, Text, Image, TouchableOpacity } from 'react-native'
import React from 'react'
import { router } from 'expo-router';
import { useSocket } from 'context/SocketContext';
import { useAuth } from 'context/AuthContext';
import { ChatQueries } from 'lib/database/db';


const ChatCard = ({ chat }) => {
    if (!chat) return null;

    const { onlineUserIds } = useSocket();
    const { user } = useAuth();

    const otherParticipantId = chat?.participants?.find(p => p !== user?.id);
    const isOnline = onlineUserIds.has(otherParticipantId);

    console.log(otherParticipantId)
    // --- LÓGICA DE PARSEO DE JSON ---
    let lastMsgData = { text: '', senderId: '', status: '' };

    try {
        // Intentamos parsear el contenido de lastMessageText
        if (chat.lastMessageText) {
            const parsed = JSON.parse(chat.lastMessageText);
            lastMsgData = {
                text: parsed.text || '',
                senderId: parsed.senderId || '',
                status: (parsed.status || '').toLowerCase()
            };

            console.log(user)
            console.log(lastMsgData)
        }
    } catch (e) {
        // Si falla (por ser texto plano antiguo), asignamos el valor directamente
        lastMsgData.text = chat.lastMessageText || '';
    }

    // --- LÓGICA DE UI ---
    const isLastMessageMine = lastMsgData.senderId == user?.id;

    const hasUnreadMessages =
        !isLastMessageMine &&
        lastMsgData.status !== 'read' &&
        lastMsgData.text !== '';

    const HandleNavigateToChat = async () => {
        await ChatQueries.setLastConversationMessage(chat?.id, {
            text: lastMsgData.text,
            senderId: lastMsgData.senderId,
            status: "read"
        });
        router.push({ pathname: '/chat/[id]', params: { id: chat?.id } });
    };

    return (
        <TouchableOpacity
            onPress={HandleNavigateToChat}
            activeOpacity={0.7}
            className="flex-row items-center p-4 bg-slate-900 border-b border-slate-800"
        >
            {/* Avatar */}
            <View>
                <Image
                    source={{ uri: `https://api.dicebear.com/9.x/bottts/png?seed=${otherParticipantId}` }}
                    className={`w-12 h-12 rounded-full mr-4 border ${isOnline ? 'border-cyan-400' : 'border-slate-700'}`}
                    resizeMode="cover"
                />
                {isOnline && (
                    <View className="absolute bottom-0 right-4 w-3 h-3 rounded-full bg-green-500 border-2 border-slate-900" />
                )}
            </View>

            <View className="flex-1">
                <View className="flex-row justify-between items-center mb-1">
                    <Text className="text-white font-bold text-lg flex-1 mr-2" numberOfLines={1}>
                        {chat.name ? chat.name.toUpperCase() : "USUARIO DESCONOCIDO"}
                    </Text>

                    <Text className="text-slate-500 text-xs">
                        {chat.updatedAt
                            ? new Date(chat.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '--:--'}
                    </Text>
                </View>

                <View className="flex-row justify-between items-center">
                    {/* Texto del mensaje usando los datos del JSON */}
                    <Text
                        className={`text-sm flex-1 mr-2 ${hasUnreadMessages ? 'text-white font-semibold' : 'text-slate-400 italic'}`}
                        numberOfLines={1}
                    >
                        {lastMsgData.text
                            ? lastMsgData.text.startsWith('http')
                                ? (isLastMessageMine ? `Tú: Entidad cifrada` : "Entidad cifrada")
                                : (isLastMessageMine ? `Tú: ${lastMsgData.text}` : lastMsgData.text)
                            : "Mensajes te esperan..."}
                    </Text>

                    {/* Punto Azul */}
                    {hasUnreadMessages && (
                        <View className="w-3 h-3 rounded-full bg-cyan-400 shadow-lg shadow-cyan-500/50" />
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
};

export default ChatCard