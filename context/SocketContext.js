import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
// IMPORTANTE: Importa también ChatQueries
import { MessageQueries, ChatQueries, UserQueries } from 'lib/database/db';
import { usersService } from 'services/usersService';
import { DeviceEventEmitter } from 'react-native';
import { messagesService } from 'services/messageService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { revisarConexion } from 'lib/utils';
import { decryptMessage } from 'services/cryptoService';
import { performGlobalSync } from 'components/managers/syncManager';

const SocketContext = createContext();

const shouldUpdateStatus = (currentStatus, nextStatus) => {
    const priority = { 'sent': 1, 'received': 2, 'read': 3 };
    const current = priority[currentStatus?.toLowerCase()] || 0;
    const next = priority[nextStatus?.toLowerCase()] || 0;
    return next > current;
};

export const SocketProvider = ({ children }) => {
    const { user, token } = useAuth();
    const [socket, setSocket] = useState(null);
    const [online, setOnline] = useState(false);

    //almacena los ids de los usuarios online
    const [onlineUserIds, setOnlineUserIds] = useState(new Set());

    const [hayConexion, setHayConexion] = useState(false);

    useEffect(() => {
        revisarConexion().then((res) => {
            setHayConexion(res);
        });
    }, []);

    useEffect(() => {

        //si hay usuario y token continuamos
        if (user && token && hayConexion) {

            //creamos el socket hacia el servidor
            const newSocket = io(process.env.EXPO_PUBLIC_SOCKET_URL, {
                auth: { token: token },
                transports: ['websocket'],
            });

            //cuando se conecta el socket
            newSocket.on('connect', () => {
                //Pedimos la lista de usuarios online

                console.log("SOCKET-CONTEXT | CONNECTED");

                newSocket.emit('get_online_users');

                //tiempo de espera para comprobar si seguimos conectados tras una conexión
                setTimeout(() => {
                    if (newSocket.connected) {
                        setOnline(true);
                        performGlobalSync(newSocket, token, user)
                    }
                }, 900);

            });

            //cuando recibimos la lista de usuarios online
            newSocket.on('all_online_users', (usersArray) => {
                //actualizamos la lista de usuarios online
                setOnlineUserIds(new Set(usersArray));
            });

            //cuando recibimos el estado de un usuario
            newSocket.on('user_status_change', ({ userId, status }) => {
                //actualizamos la lista de usuarios online
                setOnlineUserIds((prev) => {
                    const newSet = new Set(prev);
                    //si el usuario es online lo añadimos
                    if (status === 'online') {
                        newSet.add(userId);
                    } else {
                        //si el usuario es offline lo eliminamos
                        newSet.delete(userId);
                    }
                    return newSet;
                });
            });

            //cuando se desconecta el socket
            newSocket.on('disconnect', async () => {
                //marcamos la bandera online como false
                setOnline(false);
                //vaciamos la lista de usuarios online
                setOnlineUserIds(new Set());
                //guardamos el timestamp de la ultima conexion
                // await AsyncStorage.setItem('@lastConexionTimestamp', String(Date.now()));
            });

            // ------------------------------------------------
            // 1. ESCUCHAR MENSAJES ENTRANTES
            // ------------------------------------------------
            newSocket.on('new_message', async (serverMsg) => {
                try {
                    const decryptedText = await decryptMessage(serverMsg.content);

                    // LÓGICA DE ESTADO COHERENTE:
                    // Si el mensaje lo envié YO (desde otro dispositivo), el estado inicial es 'sent'
                    // Si lo envió OTRO, el estado es 'received'
                    const initialStatus = serverMsg.senderId === user.id ? 'sent' : 'received';

                    await MessageQueries.saveMessage({
                        messageId: serverMsg.id,
                        conversationId: serverMsg.conversationId,
                        senderId: serverMsg.senderId,
                        content: decryptedText,
                        createdAt: serverMsg.createdAt,
                        status: initialStatus, // <--- CAMBIO AQUÍ
                        isSynced: 1,
                        type: serverMsg.type || 'text'
                    });

                    // SOLO emitimos el status_update si el mensaje NO es nuestro
                    if (serverMsg.senderId !== user.id) {
                        newSocket.emit('message_status_update', {
                            messageId: serverMsg.id,
                            status: 'received',
                            userId: user.id,
                            senderId: serverMsg.senderId
                        });
                    }

                    DeviceEventEmitter.emit('event_refresh_messages');
                    DeviceEventEmitter.emit('event_refresh_conversations');
                } catch (e) {
                    console.error("SOCKET-CONTEXT | ERROR EN NEW_MESSAGE -> ", e);
                }
            });

            // ------------------------------------------------
            // 2. ESCUCHAR ESTADOS DE MENSAJES
            // ------------------------------------------------
            newSocket.on('message_status_changed', async (serverMsg) => {
                try {
                    // 1. Buscamos el estado actual en la base de datos local
                    const localMsg = await MessageQueries.getMessageById(serverMsg.messageId);

                    // 2. Solo actualizamos si el nuevo estado es superior (ej: de sent a received)
                    if (shouldUpdateStatus(localMsg?.status, serverMsg.status)) {
                        await MessageQueries.updateMessageStatus({
                            messageId: serverMsg.messageId,
                            status: serverMsg.status.toLowerCase()
                        });

                        DeviceEventEmitter.emit('event_refresh_messages');
                        DeviceEventEmitter.emit('event_refresh_conversations');
                    }
                } catch (e) {
                    console.error("SOCKET-CONTEXT | ERROR EN MESSAGE_STATUS_CHANGED -> ", e);
                }
            });

            // ------------------------------------------------
            // 2. ESCUCHAR NUEVAS CONVERSACIONES
            // ------------------------------------------------
            newSocket.on('new_conversation', async (chatData) => {
                try {


                    //obtenemos todos los ids de los participantes
                    const participantIds = chatData.participants.map(p => p.userId);

                    console.log("SOCKET-CONTEXT | NEW_CONVERSATION | participantIds -> ", participantIds);

                    for (const id of participantIds) {
                        if (id !== user.id) {
                            const userData = await usersService.getUserFromServer(token, { id: id });
                            console.log("SOCKET-CONTEXT | NEW_CONVERSATION | userData -> ", userData);
                            //guardamos los usuarios en la base de datos local
                            await UserQueries.upsertUser({ ...userData, isMe: 0 });
                        }
                    }

                    console.log("SOCKET-CONTEXT | NEW_CONVERSATION | chatData -> ", chatData);

                    const preSaveConversation = {
                        id: chatData.id,
                        type: chatData.type,
                        participants: participantIds,
                        name: chatData?.name || "",
                        imageUrl: chatData?.imageUrl || "",
                        updatedAt: chatData.updatedAt,
                        isSynced: 1,
                    };

                    //guardamos la conversacion en la base de datos local
                    await ChatQueries.upsertConversation(preSaveConversation, user.id);

                    //emitimos un evento para refrescar los chats
                    DeviceEventEmitter.emit('event_refresh_conversations');
                } catch (e) {
                    console.error("SOCKET-CONTEXT | ERROR EN NEW_CONVERSATION -> ", e);
                }
            });

            //guardamos el socket en el estado
            setSocket(newSocket);

            //limpiamos el socket cuando se desmonta el componente
            return () => newSocket.close();
        } else {
            //si no hay usuario o token, cerramos el socket     
            if (socket) {
                socket.close();
                setSocket(null);
                setOnline(false);
                setOnlineUserIds(new Set());
            }
        }
    }, [user, token]);

    return (
        <SocketContext.Provider value={{ socket, online, onlineUserIds, setOnlineUserIds }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => useContext(SocketContext);