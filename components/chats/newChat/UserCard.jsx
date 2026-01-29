import { View, Text, Image, TouchableOpacity, DeviceEventEmitter } from 'react-native'
import React from 'react'
import { Ionicons } from '@expo/vector-icons'
import { ChatQueries } from 'lib/database/db';
import { router } from 'expo-router';
import { getUUID } from 'lib/utils';
import { useAuth } from 'context/AuthContext';
import { useSocket } from 'context/SocketContext';
import { conversationService } from 'services/conversationService';

const UserCard = ({ contact }) => {

  const { user, token } = useAuth();
  const { socket, online } = useSocket();



  const handleCreateOrFindChat = async () => {

    //busca si ya existe un chat con ese usuario en la base de datos local
    let localChat = await ChatQueries.findExistingPrivateChatOnLocal(user.id, contact.id);
    //si existe, entra al chat
    if (localChat) {
      router.push({ pathname: '/chat/[id]', params: { id: localChat.id } });
      return;
    }


    //busca si ya existe un chat con ese usuario en la base de datos del servidor
    if (online) {
      try {
        const serverChat = await conversationService.findExistingConversationOnServer(token, contact.id);

        if (serverChat) {
          // Guardamos y entramos
          await ChatQueries.upsertConversation({
            ...serverChat,
            participants: [user.id, contact.id], // Asegurar formato array
            is_synced: 1
          }, user.id);

          //actualiza la lista de chats
          DeviceEventEmitter.emit('event_refresh_conversations');
          //entra al chat
          router.push({ pathname: '/chat/[id]', params: { id: serverChat.id } });
          return;
        }
      } catch (e) {
        console.error("ERROR EN NEWCHAT - handleCreateOrFindChat - findExistingConversationOnServer:", e);
      }
    }

    //crea un nuevo chat
    const newChatId = getUUID(); // Generamos ID local

    // Insertamos directamente el nuevo
    await ChatQueries.upsertConversation({
      id: newChatId,
      type: "DIRECT",
      updated_at: new Date().toISOString(),
      participants: [user.id, contact.id],
      is_synced: 0
    }, user.id);

    //actualiza la lista de chats
    DeviceEventEmitter.emit('event_refresh_conversations');
    //entra al chat
    router.push({ pathname: '/chat/[id]', params: { id: newChatId } });

    // 4. CUARTO: Sincronización silenciosa (Fire and Forget controlado)
    if (socket && online) {
      const presendConversation = {
        id: newChatId,
        type: "DIRECT",
        participants: [user.id, contact.id],
      };

      try {

        //enviamos la conversacion al servidor
        const serverConversation = await conversationService.sendConversationToServer(token, presendConversation);

        //si la conversacion se envio correctamente
        if (serverConversation) {
          await ChatQueries.markConversationAsSynced(newChatId);
        }
      } catch (e) {
        console.error("ERROR EN NEWCHAT - handleCreateOrFindChat - sendConversationToServer: ", e);
      }
    }
  };


  return (
    <TouchableOpacity
      onPress={handleCreateOrFindChat}
      activeOpacity={0.7}
      className="flex-row items-center p-4 bg-slate-900 border-b border-slate-800 mx-2 mb-2 rounded-xl"
    >
      {/* 1. Avatar */}
      <Image
        source={{
          uri: "https://api.dicebear.com/9.x/bottts/png?seed=" + contact?.id
        }}
        className="w-12 h-12 rounded-full bg-slate-800"
        resizeMode="cover"
      />

      {/* 2. Info del Usuario */}
      <View className="flex-1 ml-4">
        <Text className="text-white font-bold text-lg">
          {contact?.displayName ? contact.displayName.toUpperCase() : "USUARIO"}
        </Text>
        {/* <Text className="text-slate-500 text-xs">
            Usuario desde {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Fecha desconocida'}
        </Text> */}
      </View>

      {/* 3. Icono de Acción */}
      <View className="bg-slate-800 p-2 rounded-full h-10 w-10 items-center justify-center">
        <Ionicons name="chatbubble-ellipses-outline" size={20} color="#00FFFF" />
      </View>

    </TouchableOpacity>
  )
}

export default UserCard