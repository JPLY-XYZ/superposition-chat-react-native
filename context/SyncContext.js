import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useSocket } from './SocketContext';
import { ChatQueries, MessageQueries, UserQueries, utilsQueries } from '../lib/database/db';
import { useAuth } from './AuthContext';
import { conversationService } from 'services/conversationService';
import { DeviceEventEmitter } from 'react-native';
import { syncService } from 'services/syncService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SyncContext = createContext();

export const SyncProvider = ({ children }) => {
    const { socket, online } = useSocket();
    const { token, user } = useAuth();

    //referencia para evitar que se ejecute mas de una vez
    const isSyncingRef = useRef(false);

    useEffect(() => {
        // Solo intentamos si tenemos todo lo necesario
        if (user && online && socket) {

            const performSync = async () => {
                //si ya se esta sincronizando, no hacemos nada
                if (isSyncingRef.current) {
                    return;
                }

                // Ponemos el semáforo en ROJO
                isSyncingRef.current = true;

                try {
                    //procesamos lo que esta en la bandeja de salida
                    await processOutbox();

                    //procesamos lo que esta en la bandeja de entrada
                    await processInbox();
                } catch (error) {
                    console.error("SYNC-CONTEXT ERROR - performSync: ", error);
                } finally {
                    // Ponemos el semáforo en VERDE
                    isSyncingRef.current = false;
                }
            };

            // Ejecutamos la función
            performSync();
        }
    }, [online, socket, user]);

    // Función para procesar la bandeja de salida
    const processOutbox = async () => {

        //Obtenemos las conversaciones pendientes de la base de datos local
        const pendingConversations = await ChatQueries.getUnsyncedConversations();

        //si hay conversaciones pendientes, las procesamos
        if (pendingConversations.length != 0) {


            console.log("CONVERSACIONES PENDIENTES DE SUBIR: " + pendingConversations.length);


            //Recorremos las conversaciones pendientes
            for (const conversation of pendingConversations) {
                //Obtenemos los participantes de la conversación
                const participants = await ChatQueries.getParticipantsConversations(conversation.id);
                //Crear el objeto de la conversación
                const presendConversation = {
                    id: conversation.id,
                    type: conversation.type,
                    name: conversation.name,
                    participants: participants,
                };

                try {

                    //enviamos la conversacion al servidor
                    const serverConversation = await conversationService.sendConversationToServer(token, presendConversation);

                    //si la conversacion se envio correctamente
                    if (serverConversation) {
                        await ChatQueries.markConversationAsSynced(conversation.id);
                    }
                } catch (e) {
                    console.error("SYNC-CONTEXT ERROR - processOutbox - processConversation: ", e);
                }
            }

            //emitimos el evento para que se actualice la pantalla
            DeviceEventEmitter.emit('event_refresh_conversations');
        }

        // Obtenemos los mensajes pendientes de la base de datos local
        const pendingMessages = await MessageQueries.getUnsyncedMessages();

        //si hay mensajes pendientes, los procesamos
        if (pendingMessages.length != 0) {

            console.log("MENSAJES PENDIENTES DE SUBIR: " + pendingMessages.length);

            //Recorremos los mensajes pendientes
            for (const message of pendingMessages) {
                try {

                    if (socket && online) { // Asegúrate de comparar las variables correctas


                        await new Promise((resolve, reject) => {

                            const timer = setTimeout(() => {
                                reject(new Error("Timeout: El servidor tardó demasiado en responder"));
                            }, 5000);
                            socket.emit('send_message', message, async (response) => {

                                if (response.success) {
                                    //actualizamos el estado del mensaje a enviado
                                    await MessageQueries.updateMessageStatus({ messageId: message.id, status: "sent" });
                                    //marcamso el mensaje como sincronizado
                                    await MessageQueries.markAsSynced(message.id);
                                } else {
                                    console.warn("SYNC-CONTEXT ERROR - processOutbox - send_message - El servidor rechazó el mensaje:", response?.error);
                                }
                                clearTimeout(timer);
                                resolve();
                            });
                        })
                    }

                } catch (e) {
                    console.error("SYNC-CONTEXT ERROR - processOutbox - send_message: ", e);
                }
            };

            //emitimos el evento para que se actualice la pantalla
            DeviceEventEmitter.emit('event_refresh_messages');
        }
    };


    const processInbox = async () => {

        //Obtenemos los datos no sincronizados del servidor

        const unsyncedData = await syncService.getUnsyncedDataFromServer(token);


        //desestructuramos los datos
        const { messages, conversations, messageUpdates } = unsyncedData;

        if (conversations.length > 0) {

            console.log("CONVERSACIONES DESCARGADAS: " + conversations.length);

            //Recorremos las conversaciones pendientes
            for (const conversation of conversations) {
                //Obtenemos los participantes de la conversación

                const participants = conversation.participants;

                for (const participant of participants) {

                    //Obtenemos el usuario
                    const participantUser = participant.user;

                    //si el usuario es el usuario actual, no hacemos nada
                    if (participantUser.id === user.id) continue;

                    //Crear el objeto del usuario
                    const preSaveUser = {
                        id: participantUser.id,
                        displayName: participantUser.displayName,
                        imageUrl: participantUser.imageUrl,
                        publicKey: participantUser.publicKey,
                        code: participantUser.code,
                    };

                    //añadimos el usuario a la base de datos local
                    await UserQueries.upsertUser({ ...preSaveUser, isMe: 0 });

                }

                //Crear el objeto de la conversación
                const preSaveConversation = {
                    id: conversation.id,
                    type: conversation.type,
                    participants: participants.map(p => p.user.id),
                    name: conversation?.name || "",
                    imageUrl: conversation?.imageUrl || "",
                    updatedAt: conversation.updatedAt,
                    isSynced: 1,
                };

                //añadimos la conversación a la base de datos local
                await ChatQueries.upsertConversation(preSaveConversation, user.id);
            }

        }
        if (messages.length > 0) {

            console.log("MESSAGES DESCARGADOS: " + messages.length + " - " + JSON.stringify(messages));

            //Recorremos las conversaciones pendientes
            for (const message of messages) {
                //Obtenemos los participantes de la conversación


                const existingMessage = await MessageQueries.getMessageById(message.id);

                // 2. Si existe, saltamos este mensaje y no hacemos nada más
                if (existingMessage) {
                    continue;
                }
                let preSaveMessage;
                if (message.senderId === user.id) {
                    preSaveMessage = {
                        messageId: message.id,
                        conversationId: message.conversationId,
                        senderId: message.senderId,
                        content: message.content,
                        createdAt: message.createdAt,
                        status: 'superposed',
                        is_synced: 1,
                        type: message.type,
                    };
                } else {

                    preSaveMessage = {
                        messageId: message.id,
                        conversationId: message.conversationId,
                        senderId: message.senderId,
                        content: message.content,
                        createdAt: message.createdAt,
                        status: 'received',
                        is_synced: 1,
                        type: message.type,
                    };
                }

                await MessageQueries.saveMessage(preSaveMessage);


                try {

                    await new Promise((resolve, reject) => {

                        const timer = setTimeout(() => {
                            reject(new Error("Timeout: El servidor tardó demasiado en responder"));
                        }, 5000);

                        socket.emit('message_status_update', {
                            messageId: message.id,
                            status: 'received',
                            userId: user.id,
                            senderId: message.senderId
                        }, async (response) => {
                            clearTimeout(timer);
                            resolve();
                        });
                    });

                    console.log("MENSAJE DESCARGADO Y ACTUALIZACION DE ESTADO ENVIADA");



                } catch (e) {
                    console.error("SYNC-CONTEXT ERROR - processInbox - message_status_update: ", e);
                }
                DeviceEventEmitter.emit('event_refresh_messages');
                DeviceEventEmitter.emit('event_refresh_chats');
            }
        }

        if (messageUpdates.length > 0) {

            console.log("MESSAGES ACTUALIZADOS DESCARGADOS: " + messageUpdates.length);

            //Recorremos las actualizaciones de mensajes pendientes
            // for (const messageUpdate of messageUpdates) {

            //     await MessageQueries.updateMessageStatus({ messageId: messageUpdate.id, status: messageUpdate.status });

            // }
        }
        DeviceEventEmitter.emit('event_refresh_messages');
        DeviceEventEmitter.emit('event_refresh_chats');
    };


    const forceSync = async () => { // Añadir async
        if (isSyncingRef.current) return; // Respetar el semáforo

        isSyncingRef.current = true;
        try {
            await processOutbox(); // Añadir await
            await processInbox();  // Añadir await
        } finally {
            isSyncingRef.current = false;
        }
    };

    return (
        <SyncContext.Provider value={{ forceSync }}>
            {children}
        </SyncContext.Provider>
    );
};

export const useSync = () => useContext(SyncContext);   