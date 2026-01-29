import ButtonNewChat from "components/chats/mainMenu/ButtonNewChat";
import ChatCard from "components/chats/mainMenu/ChatCard";
import ChatsHeader from "components/chats/mainMenu/ChatsHeader";
import { ChatQueries } from "lib/database/db";
import { useCallback, useEffect, useState } from "react";
import { DeviceEventEmitter, ScrollView, View, ActivityIndicator, Text } from "react-native";
import { useAuth } from "context/AuthContext";
import { useFocusEffect } from "expo-router";

const Chats = () => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // 1. FUNCIÓN DE CARGA
  const fetchChats = useCallback(async () => {

    //A. Si el usuario aún no está listo en el contexto, no hacemos nada (ni quitamos el loading)
    if (!user?.id) {
        return; 
    }
    
    try {
      //obtiene todas las conversaciones del usuario de la base de datos local
      const data = await ChatQueries.getAllConversations(user.id);
      //actualiza el estado de chats
      setChats(data);
    } catch (error) {
      console.error("CHATS VIEW - fetchChats: ", error);
    } finally {
      setLoading(false);
    }
  }, [user]); 

  //AL ENFOCAR LA PANTALLA (Para cuando vuelves de otra tab)
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
          fetchChats();
      }
    }, [user?.id, fetchChats])
  );

  // 4. SUSCRIPCIÓN A EVENTOS
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('event_refresh_conversations', () => {
      fetchChats();
    });
    return () => subscription.remove();
  }, [fetchChats]);

 
  return (
    <View className="flex-1 bg-slate-950">
      <ChatsHeader />
      
      {loading ? (
        <View className="flex-1">
          {[...Array(6)].map((_, index) => (
            <View 
              key={index} 
              className="flex-row items-center p-4 bg-slate-900 border-b border-slate-800 animate-pulse"
            >
              <View className="w-12 h-12 rounded-full mr-4 bg-slate-800" />

              <View className="flex-1">
                <View className="flex-row justify-between items-center mb-2">
                  <View className="h-5 w-32 bg-slate-800 rounded" />
                  <View className="h-3 w-10 bg-slate-800 rounded" />
                </View>

                <View className="h-4 w-3/4 bg-slate-800 rounded" />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <ScrollView className="flex-1">
          {chats.length > 0 ? (
             chats.map((chat) => (
               <ChatCard key={chat.id} chat={chat} />
             ))
          ) : (
             <View className="flex-1 justify-center items-center mt-10 opacity-50">
                <Text className="text-gray-500 text-sm">No hay conversaciones</Text>
             </View>
          )}
          <View className="h-24" /> 
        </ScrollView>
      )}

      <ButtonNewChat />
    </View>
  )
}

export default Chats;