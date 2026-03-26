import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { MessageQueries, ChatQueries, UserQueries } from 'lib/database/db';
import { usersService } from 'services/usersService';
import { DeviceEventEmitter } from 'react-native';
import { revisarConexion } from 'lib/utils';
import { decryptMessage } from 'services/cryptoService';
import { performGlobalSync } from 'components/managers/syncManager';
import { getSettings } from "lib/auth/storage"; // Importación necesaria

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
    const [onlineUserIds, setOnlineUserIds] = useState(new Set());
    const [hayConexion, setHayConexion] = useState(false);

    // 1. Comprobar conexión inicial
    useEffect(() => {
        revisarConexion().then((res) => {
            setHayConexion(res);
        });
    }, []);

    // 2. Efecto principal de Socket
    useEffect(() => {
        let activeSocket = null;

        const initializeSocket = async () => {
            // Si hay usuario, token y la red/server responden
            if (user && token && hayConexion) {

                // --- SACAR WS_URL DE AJUSTES ---
                const { WS_URL } = await getSettings();

                if (!WS_URL) {
                    console.error("SOCKET-CONTEXT | No hay WS_URL configurada");
                    return;
                }

                // Creamos el socket con la URL dinámica
                const newSocket = io(WS_URL, {
                    auth: { token: token },
                    transports: ['websocket'],
                });

                activeSocket = newSocket;

                // --- LISTENERS DEL SOCKET ---

                newSocket.on('connect', () => {
                    console.log("SOCKET-CONTEXT | CONNECTED TO:", WS_URL);
                    newSocket.emit('get_online_users');

                    setTimeout(() => {
                        if (newSocket.connected) {
                            setOnline(true);
                            performGlobalSync(newSocket, token, user);
                        }
                    }, 900);
                });

                newSocket.on('all_online_users', (usersArray) => {
                    setOnlineUserIds(new Set(usersArray));
                });

                newSocket.on('user_status_change', ({ userId, status }) => {
                    setOnlineUserIds((prev) => {
                        const newSet = new Set(prev);
                        if (status === 'online') {
                            newSet.add(userId);
                        } else {
                            newSet.delete(userId);
                        }
                        return newSet;
                    });
                });

                newSocket.on('disconnect', async () => {
                    setOnline(false);
                    setOnlineUserIds(new Set());
                });

                // 1. ESCUCHAR MENSAJES ENTRANTES
                newSocket.on('new_message', async (serverMsg) => {
                    try {
                        const decryptedText = await decryptMessage(serverMsg.content);
                        const initialStatus = serverMsg.senderId === user.id ? 'sent' : 'received';

                        await MessageQueries.saveMessage({
                            messageId: serverMsg.id,
                            conversationId: serverMsg.conversationId,
                            senderId: serverMsg.senderId,
                            content: decryptedText,
                            createdAt: serverMsg.createdAt,
                            status: initialStatus,
                            isSynced: 1,
                            type: serverMsg.type || 'text'
                        });

                        await ChatQueries.setLastConversationMessage(serverMsg.conversationId, {
                            text: decryptedText,
                            senderId: serverMsg.senderId,
                            status: initialStatus
                        });

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

                // 2. ESCUCHAR ESTADOS DE MENSAJES
                newSocket.on('message_status_changed', async (serverMsg) => {
                    try {
                        const localMsg = await MessageQueries.getMessageById(serverMsg.messageId);
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

                // 3. ESCUCHAR NUEVAS CONVERSACIONES
                newSocket.on('new_conversation', async (chatData) => {
                    try {
                        const participantIds = chatData.participants.map(p => p.userId);
                        for (const id of participantIds) {
                            if (id !== user.id) {
                                const userData = await usersService.getUserFromServer(token, { id: id });
                                await UserQueries.upsertUser({ ...userData, isMe: 0 });
                            }
                        }

                        const preSaveConversation = {
                            id: chatData.id,
                            type: chatData.type,
                            participants: participantIds,
                            name: chatData?.name || "",
                            imageUrl: chatData?.imageUrl || "",
                            updatedAt: chatData.updatedAt,
                            isSynced: 1,
                        };

                        await ChatQueries.upsertConversation(preSaveConversation, user.id);
                        DeviceEventEmitter.emit('event_refresh_conversations');
                    } catch (e) {
                        console.error("SOCKET-CONTEXT | ERROR EN NEW_CONVERSATION -> ", e);
                    }
                });

                setSocket(newSocket);

            } else {
                // Limpieza si se cierra sesión o se pierde conexión lógica
                if (socket) {
                    socket.close();
                    setSocket(null);
                    setOnline(false);
                    setOnlineUserIds(new Set());
                }
            }
        };

        initializeSocket();

        // Limpieza al desmontar o cambiar dependencias
        return () => {
            if (activeSocket) {
                activeSocket.close();
            }
        };
    }, [user, token, hayConexion]);

    return (
        <SocketContext.Provider value={{ socket, online, onlineUserIds, setOnlineUserIds }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => useContext(SocketContext);