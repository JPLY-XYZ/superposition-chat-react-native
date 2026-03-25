import { View, FlatList, KeyboardAvoidingView, Platform, Keyboard, DeviceEventEmitter, ActivityIndicator } from 'react-native';
import ChatPageHeader from 'components/chats/insideChat/ChatPageHeader';
import ChatMessage from 'components/chats/insideChat/ChatMessage';
import ChatInput from 'components/chats/insideChat/ChatInput';
import { ChatQueries, MessageQueries, UserQueries } from 'lib/database/db';
import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from 'context/AuthContext';
import { getUUID } from 'lib/utils';
import { useSocket } from 'context/SocketContext';
import { useIsFocused } from '@react-navigation/native'
import { usersService } from 'services/usersService';
import { encryptMessage } from 'services/cryptoService';

export default function Chat() {

  const { id } = useLocalSearchParams();
  const { user, token } = useAuth();
  const { socket, online } = useSocket();
  const isFocused = useIsFocused();

  // LISTENER TECLADO (Android ajuste manual para evitar el solapamiento con el teclado) 
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS === 'android') {
      const show = Keyboard.addListener('keyboardDidShow', e => setKeyboardHeight(e.endCoordinates.height));
      const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
      return () => { show.remove(); hide.remove(); };
    }
  }, []);


  // DATOS DEL CHAT
  const [messages, setMessages] = useState([]);
  const [chat, setChat] = useState(null);

  // función para cargar mensajes
  const fetchMessages = useCallback(async () => {
    if (!user) return;
    const data = await MessageQueries.getMessagesByChat(id);
    setMessages(data);
  }, [user]);

  const getChat = async () => {
    if (!user) return;
    const localChat = await ChatQueries.getConversationById(id, user.id);
    setChat(localChat);
  };


  useEffect(() => {
    getChat();
  }, [user]);

  // useEffect para cargar mensajes y suscribirse al evento
  useEffect(() => {
    // cargar mensajes al entrar

    fetchMessages();

    // Suscribirse al evento
    const subscription = DeviceEventEmitter.addListener('event_refresh_messages', () => {
      fetchMessages();
    });

    // limpieza al salir
    return () => {
      subscription.remove();
    };
  }, [fetchMessages]);

  // useEffect para marcar el chat como leído (marca todo el chat como leído en el servidor)
  useEffect(() => {
    if (!socket || !online || !id || messages.length === 0 || !isFocused) return;


    // Si es de OTRO, esperamos un poco antes de marcar como leído
    const delayDebounce = setTimeout(() => {

      console.log("MARCANDO COMO LEIDO" + id + "PARA EL USUARIO " + user.displayName);

      socket.emit('mark_conversation_as_read', {
        conversationId: id,
      }, (response) => {

        if (response.success) {
          //MessageQueries.markChatAsRead(id);
        }

      });
    }, 600);

    // limpieza al salir
    return () => clearTimeout(delayDebounce);

  }, [messages, socket, online]);


  // función para enviar mensaje
  const handleSendMessage = async (text, type) => {
    if (!text.trim()) return;

    //obtener el usuario actual del Server (puede haber actualizado algo)

    const userData = await usersService.getUserFromServer(token, { id: chat?.participants?.find(participant => participant !== user?.id) });

    console.log(userData)

    await UserQueries.upsertUser({
      id: userData.id,
      displayName: userData.displayName,
      imageUrl: userData.imageUrl,
      isMe: 0,
      code: userData.code,
      publicKey: userData.publicKey,
    });

    const ecriptedText = encryptMessage(text, userData.publicKey)

    // Crear el objeto del mensaje
    const newMessage = {
      messageId: getUUID(),
      conversationId: id,
      senderId: user.id,
      type: type,
      content: text,
      createdAt: new Date().toISOString(),
      status: 'pending',
      isSynced: 0
    };

    try {
      // guardar el mensaje localmente
      await MessageQueries.saveMessage(newMessage);
      // actualizar la lista de mensajes
      setMessages(prev => [newMessage, ...prev]);

      // enviar el mensaje al servidor atraves del socket
      if (socket && online && newMessage.conversationId === chat.id) {

        await new Promise(resolve => {
          socket.emit('send_message', {
            id: newMessage.messageId,
            conversationId: newMessage.conversationId,
            senderId: newMessage.senderId,
            content: ecriptedText,
            type: newMessage.type,
            createdAt: newMessage.createdAt,
          }, async (response) => {


            if (response.success) {
              //actualizamos el estado del mensaje a enviado
              await MessageQueries.updateMessageStatus({ messageId: newMessage.messageId, status: "sent" });
              //marcamso el mensaje como sincronizado
              await MessageQueries.markAsSynced(newMessage.messageId);

              await ChatQueries.setLastConversationMessage(newMessage.conversationId, {
                text: text,
                senderId: user.id,
                status: "sent"
              });
              //actualizamos la lista de mensajes
              setMessages(current =>
                current.map(m => m.messageId === newMessage.messageId ? { ...m, status: 'sent', is_synced: 1 } : m)
              );
            } else {
              console.warn("CHAT ERROR - send_message - El servidor rechazó el mensaje:", response?.error);
            }
            resolve();
          });


        })
      }

    } catch (e) {
      console.error("Error guardando mensaje:", e);
    }
  };


  if (!chat) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' }}>
        <ActivityIndicator size="large" color="#00FFFF" />
      </View>
    );
  }
  // 5. Renderizado
  return (
    <View style={{ flex: 1, backgroundColor: '#020617' }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1, paddingBottom: Platform.OS === 'android' ? keyboardHeight : 0 }}>
          <ChatPageHeader chat={chat} />
          <FlatList
            data={messages}
            keyExtractor={(item, index) => item.messageId ?? item.id ?? index.toString()}
            inverted
            initialNumToRender={15}      // Carga solo 15 al abrir el chat
            maxToRenderPerBatch={10}     // Renderiza de 10 en 10 al hacer scroll
            windowSize={5}               // Mantiene solo 5 "pantallas" de mensajes en memoria
            removeClippedSubviews={true} // (Solo Android) Libera memoria de lo que no se ve
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 10 }}
            renderItem={({ item }) => (
              <ChatMessage message={item} />
            )}
          />
          <ChatInput onSend={(text, type) => handleSendMessage(text, type)} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}