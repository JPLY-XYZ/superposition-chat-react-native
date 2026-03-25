import { syncService } from 'services/syncService';
import { decryptMessage } from 'services/cryptoService';
import { DeviceEventEmitter } from 'react-native';
import { ChatQueries, MessageQueries, UserQueries } from 'lib/database/db';

let isSyncing = false;

const shouldUpdateStatus = (currentStatus, nextStatus) => {
    const priority = { 'sent': 1, 'received': 2, 'read': 3 };
    const current = priority[currentStatus?.toLowerCase()] || 0;
    const next = priority[nextStatus?.toLowerCase()] || 0;
    return next > current;
};

export const performGlobalSync = async (socket, token, user) => {
    console.log("🚀 Sync Check - Socket:" + socket?.connected + " User:" + !!user);

    if (isSyncing || !socket?.connected || !token || !user) return;

    isSyncing = true;



    try {
        const unsyncedData = await syncService.getUnsyncedDataFromServer(token);
        const { messages, conversations, messageUpdates } = unsyncedData;

        // --- CONVERSACIONES ---
        for (const conv of conversations) {
            const participantIds = conv.participants.map(p => {
                if (p.user.id !== user.id) {
                    UserQueries.upsertUser({
                        id: p.user.id,
                        displayName: p.user.displayName,
                        imageUrl: p.user.imageUrl,
                        publicKey: p.user.publicKey,
                        code: p.user.code
                    });
                }
                return p.user.id;
            });

            await ChatQueries.upsertConversation({
                id: conv.id,
                type: conv.type,
                participants: participantIds,
                name: conv?.name || "",
                imageUrl: conv?.imageUrl || "",
                updatedAt: conv.updatedAt,
                isSynced: 1,
            }, user.id);
        }

        let mensajesCifradosEnviado = false
        // --- MENSAJES ---
        for (const msg of messages) {
            const exists = await MessageQueries.getMessageById(msg.id);

            const decifrado = await decryptMessage(msg.content);
            if (decifrado === "MENSAJE CIFRADO") {

                if (!mensajesCifradosEnviado) {
                    await MessageQueries.saveMessage({
                        messageId: "nunId",
                        conversationId: msg.conversationId,
                        senderId: msg.senderId,
                        content: "HAY UN TOTAL DE " + messages.length + " CIFRADOS",
                        createdAt: msg.createdAt,
                        status: null, // Ya viene calculado del servidor
                        is_synced: 1,
                        type: "info"
                    });
                    await ChatQueries.setLastConversationMessage(msg.conversationId, {
                        text: "HAY UN TOTAL DE " + messages.length + " CIFRADOS",
                        senderId: msg.senderId,
                        status: "read"
                    });
                }

                mensajesCifradosEnviado = true


            } else {

                if (!exists) {
                    await MessageQueries.saveMessage({
                        messageId: msg.id,
                        conversationId: msg.conversationId,
                        senderId: msg.senderId,
                        content: decifrado,
                        createdAt: msg.createdAt,
                        status: msg.status, // Ya viene calculado del servidor
                        is_synced: 1,
                        type: msg.type
                    });
                    await ChatQueries.setLastConversationMessage(msg.conversationId, {
                        text: decifrado,
                        senderId: msg.senderId,
                        status: msg.status
                    });
                } else {
                    // Si ya existe, actualizamos solo si el estado del server es "mejor"
                    if (shouldUpdateStatus(exists.status, msg.status)) {
                        await MessageQueries.updateMessageStatus({
                            messageId: msg.id,
                            status: msg.status.toLowerCase()
                        });
                    }
                }

                // Si el mensaje es de OTRO, le avisamos al server que lo recibimos
                if (msg.senderId !== user.id) {
                    socket.emit('message_status_update', {
                        messageId: msg.id,
                        status: 'RECEIVED',
                        userId: user.id,
                        senderId: msg.senderId
                    });
                }
            }
        }

        // --- ACTUALIZACIONES DE ESTADO (Ticks) ---
        if (messageUpdates && messageUpdates.length > 0) {
            console.log("🚀 Sincronizando ticks de lectura...");
            for (const update of messageUpdates) {
                const localMsg = await MessageQueries.getMessageById(update.messageId);

                // IMPORTANTE: Solo actualizar si no lo baja de categoría
                if (shouldUpdateStatus(localMsg?.status, update.status)) {
                    await MessageQueries.updateMessageStatus({
                        messageId: update.messageId,
                        status: update.status.toLowerCase()
                    });
                }
            }
        }

        // --- REFRESH ÚNICO ---
        DeviceEventEmitter.emit('event_refresh_messages');
        DeviceEventEmitter.emit('event_refresh_chats');

    } catch (error) {
        console.error("❌ Error en sincronización manual:", error);
    } finally {
        isSyncing = false;
        console.log("✅ Sincronización finalizada.");
    }
};