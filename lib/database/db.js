import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('mylocal11.db');

let dbLock = false;

const acquireLock = async () => {
  while (dbLock) {
    await new Promise(resolve => setTimeout(resolve, 50)); // Espera 50ms si está ocupado
  }
  dbLock = true;
};

const releaseLock = () => {
  dbLock = false;
};

export const initDB = () => {
  db.execSync('PRAGMA foreign_keys = ON;');

  db.execSync(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, 
      displayName TEXT NOT NULL, 
      imageUrl TEXT, 
      publicKey TEXT, 
      code TEXT,
      isMe INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY, 
      type TEXT,            -- 'DIRECT' o 'GROUP'
      name TEXT,           -- Nombre del grupo
      imageUrl TEXT,           -- Imagen del grupo
      lastMessageText TEXT, 
      updatedAt TEXT,
      isSynced INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS participants (
      conversationId TEXT,
      userId TEXT,
      PRIMARY KEY (conversationId, userId),
      FOREIGN KEY(conversationId) REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY, 
      conversationId TEXT, 
      senderId TEXT, 
      content TEXT, 
      type TEXT,
      createdAt TEXT, 
      status TEXT DEFAULT 'sending', 
      isSynced INTEGER DEFAULT 0,
      FOREIGN KEY(conversationId) REFERENCES conversations(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversationId);
    CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updatedAt DESC);
    CREATE INDEX IF NOT EXISTS idx_messages_unsynced ON messages(isSynced) WHERE isSynced = 0;
    CREATE INDEX IF NOT EXISTS idx_participants_conv ON participants(conversationId);
  `);
};

export const getSystemStats = async () => {
  try {
    const stats = await db.getFirstAsync(`
      SELECT 
        (SELECT COUNT(*) FROM conversations) as numChats,
        (SELECT COUNT(*) FROM users WHERE isMe = 0) as numContacts,
        (SELECT COUNT(*) FROM messages WHERE status = 'read') as numMessagesRead,
        (SELECT COUNT(*) FROM messages WHERE isSynced = 0) as numUnsynced,
        (SELECT COUNT(*) FROM messages) as totalMessages,
        (SELECT COUNT(*) FROM messages WHERE status = 'received') as numPendingRead
      FROM users LIMIT 1
    `);

    return {
      numChats: stats.numChats || 0,
      numContacts: stats.numContacts || 0,
      numMessagesRead: stats.numMessagesRead || 0,
      numUnsynced: stats.numUnsynced || 0,
      totalMessages: stats.totalMessages || 0,
      numPendingRead: stats.numPendingRead || 0
    };
  } catch (error) {
    console.error("ERROR - getSystemStats:", error);
    return null;
  }
};

export const utilsQueries = {
  getLastSyncedDates: async () => {
    await acquireLock();
    try {
      const convResult = await db.getFirstAsync("SELECT MAX(updatedAt) as last FROM conversations");
      const msgResult = await db.getFirstAsync("SELECT MAX(createdAt) as last FROM messages");

      console.log("Fecha de última sincronización de conversaciones:", convResult?.last);
      console.log("Fecha de última sincronización de mensajes:", msgResult?.last);

      return {
        conversations: convResult?.last || '1970-01-01T00:00:00.000Z',
        messages: msgResult?.last || '1970-01-01T00:00:00.000Z'
      };
    } finally {
      releaseLock();
    }
  }
}

// db.js
export const clearDatabase = async () => {
  await acquireLock();
  try {
    console.log("Iniciando borrado de datos locales...");

    await db.withTransactionAsync(async () => {
      // 1. Borramos mensajes primero
      await db.runAsync('DELETE FROM messages');
      // 2. Borramos conversaciones
      await db.runAsync('DELETE FROM conversations');
      // 3. Borramos usuarios
      await db.runAsync('DELETE FROM users');
    });

    console.log("Base de datos vaciada correctamente.");
  } catch (e) {
    console.error("Error al vaciar la base de datos:", e);
    throw e;
  } finally {
    releaseLock();
  }
};

// USUARIOS
export const UserQueries = {
  upsertUser: async (user) => {
    await acquireLock();
    try {
      await db.runAsync(
        `INSERT INTO users (id, displayName, imageUrl, isMe, code, publicKey) 
        VALUES (?, ?, ?, ?, ?, ?) 
        ON CONFLICT(id) DO UPDATE SET displayName=excluded.displayName, imageUrl=excluded.imageUrl, code=excluded.code, publicKey=excluded.publicKey`,
        [user.id, user.displayName, user.imageUrl, user.isMe ? 1 : 0, user.code, user.publicKey]
      );
    } finally {
      releaseLock();
    }
  },

  upsertBatchUsers: async (usersArray) => {
    await acquireLock();
    try {
      await db.withTransactionAsync(async () => {
        for (const u of usersArray) {
          await db.runAsync(
            `INSERT INTO users (id, displayName, imageUrl, isMe, code, publicKey) VALUES (?, ?, ?, ?, ?, ?) 
            ON CONFLICT(id) DO UPDATE SET displayName=excluded.displayName, imageUrl=excluded.imageUrl, code=excluded.code, publicKey=excluded.publicKey`,
            [u.id, u.displayName, u.imageUrl, u.isMe ? 1 : 0, u.code, u.publicKey]
          );
        }
      });
    } finally {
      releaseLock();
    }
  },

  getUserById: async (id) => {
    await acquireLock();
    try {
      return await db.getFirstAsync('SELECT * FROM users WHERE id = ?', [id]);
    } finally {
      releaseLock();
    }
  },

  getContacts: async () => {
    await acquireLock();
    try {
      return await db.getAllAsync('SELECT * FROM users WHERE isMe = 0');
    } finally {
      releaseLock();
    }
  },

  getMyself: async () => {
    await acquireLock();
    try {
      return await db.getFirstAsync('SELECT * FROM users WHERE isMe = 1 LIMIT 1');
    } finally {
      releaseLock();
    }
  }
};

// CHATS (CONVERSACIONES)
export const ChatQueries = {
  getAllConversations: async (myId) => {
    await acquireLock();
    try {
      // 1. Ejecutamos la consulta
      const results = await db.getAllAsync(
        `SELECT 
  c.*,
  -- Lógica para el Nombre (displayName en lugar de username)
  CASE 
    WHEN c.type = 'GROUP' THEN c.name 
    ELSE COALESCE(
      (SELECT u.displayName FROM participants p JOIN users u ON p.userId = u.id WHERE p.conversationId = c.id AND p.userId != ? LIMIT 1),
      (SELECT u.displayName FROM participants p JOIN users u ON p.userId = u.id WHERE p.conversationId = c.id AND p.userId = ? LIMIT 1)
    )
  END AS name,
  
  CASE 
    WHEN c.type = 'GROUP' THEN c.imageUrl 
    ELSE COALESCE(
      (SELECT u.imageUrl FROM participants p JOIN users u ON p.userId = u.id WHERE p.conversationId = c.id AND p.userId != ? LIMIT 1),
      (SELECT u.imageUrl FROM participants p JOIN users u ON p.userId = u.id WHERE p.conversationId = c.id AND p.userId = ? LIMIT 1)
    )
  END AS imageUrl,

    (
    SELECT json_group_array(userId) 
    FROM participants 
    WHERE conversationId = c.id
  ) as participants_json

FROM conversations c
JOIN participants me ON c.id = me.conversationId
WHERE me.userId = ?
ORDER BY c.updatedAt DESC`,

        // Pasamos myId 5 veces para rellenar todos los interrogantes (?)
        [myId, myId, myId, myId, myId]
      );

      // 2. Parseamos el resultado JSON a un array de JS real
      return results.map(chat => ({
        ...chat,
        participants: chat.participants_json ? JSON.parse(chat.participants_json) : []
      }));

    } finally {
      releaseLock();
    }
  },

  getConversationById: async (chatId, myId) => {
    await acquireLock();
    try {
      const chat = await db.getFirstAsync(
        `SELECT 
         c.*,
         CASE 
           WHEN c.type = 'GROUP' THEN c.name 
           ELSE (SELECT u.displayName FROM participants p JOIN users u ON p.userId = u.id WHERE p.conversationId = c.id AND p.userId != ? LIMIT 1)
         END AS name,
         CASE 
           WHEN c.type = 'GROUP' THEN c.imageUrl 
           ELSE (SELECT u.imageUrl FROM participants p JOIN users u ON p.userId = u.id WHERE p.conversationId = c.id AND p.userId != ? LIMIT 1)
         END AS imageUrl
       FROM conversations c
       WHERE c.id = ?`,
        [myId, myId, chatId]
      );

      if (!chat) return null;

      const participantRows = await db.getAllAsync(
        'SELECT userId FROM participants WHERE conversationId = ?',
        [chatId]
      );

      return {
        ...chat,
        participants: participantRows.map(p => p.userId)
      };
    } finally {
      releaseLock();
    }
  },

  upsertConversation: async (conv, currentUserId) => {
    await acquireLock();
    try {
      let finalConversationId = conv.id;

      // 1. LÓGICA DE VERIFICACIÓN
      if (conv.type === 'DIRECT' && conv.participants && currentUserId) {
        const otherUserId = conv.participants.find(p => p !== currentUserId);

        if (otherUserId) {
          const existing = await db.getFirstAsync(
            `SELECT c.id FROM conversations c
            JOIN participants p1 ON c.id = p1.conversationId
            JOIN participants p2 ON c.id = p2.conversationId
            WHERE c.type = 'DIRECT' 
            AND p1.userId = ? 
            AND p2.userId = ?
            LIMIT 1`,
            [currentUserId, otherUserId]
          );

          if (existing) {
            finalConversationId = existing.id;
          }
        }
      }

      // 2. TRANSACCIÓN DE GUARDADO
      await db.withTransactionAsync(async () => {
        await db.runAsync(
          `INSERT INTO conversations (id, type, name, imageUrl, lastMessageText, updatedAt, isSynced) 
          VALUES (?, ?, ?, ?, ?, ?, ?) 
          ON CONFLICT(id) DO UPDATE SET 
          lastMessageText=excluded.lastMessageText, 
          updatedAt=excluded.updatedAt,
          name=excluded.name,
          imageUrl=excluded.imageUrl`,
          [
            finalConversationId,
            conv.type,
            conv.name || null,
            conv.imageUrl || null,
            conv.lastMessageText || null,
            conv.updatedAt || null,
            conv.isSynced ?? 1
          ]
        );

        if (conv.participants && conv.participants.length > 0) {
          for (const userId of conv.participants) {
            await db.runAsync(
              `INSERT OR IGNORE INTO participants (conversationId, userId) VALUES (?, ?)`,
              [finalConversationId, userId]
            );
          }
        }
      });

      return finalConversationId;
    } finally {
      releaseLock();
    }
  },

  deleteConversation: async (chatId) => {
    await acquireLock();
    try {
      await db.runAsync('DELETE FROM conversations WHERE id = ?', [chatId]);
    } finally {
      releaseLock();
    }
  },

  getUnsyncedConversations: async () => {
    await acquireLock();
    try {
      return await db.getAllAsync(
        "SELECT * FROM conversations WHERE isSynced = 0"
      );
    } finally {
      releaseLock();
    }
  },

  getParticipantsConversations: async (conversationId) => {
    await acquireLock();
    try {
      return await db.getAllAsync(
        `SELECT * FROM participants WHERE conversationId = ?`,
        [conversationId]
      );
    } finally {
      releaseLock();
    }
  },

  markConversationAsSynced: async (chatId) => {
    await acquireLock();
    try {
      await db.runAsync(
        'UPDATE conversations SET isSynced = 1 WHERE id = ?',
        [chatId]
      );
    } finally {
      releaseLock();
    }
  },

  findExistingPrivateChatOnLocal: async (myId, contactId) => {
    await acquireLock();
    try {
      const query = `
      SELECT c.* FROM conversations c
      JOIN participants p1 ON c.id = p1.conversationId
      JOIN participants p2 ON c.id = p2.conversationId
      WHERE c.type = 'DIRECT'
      AND p1.userId = ? 
      AND p2.userId = ?
      LIMIT 1;
    `;
      return await db.getFirstAsync(query, [myId, contactId]);
    } finally {
      releaseLock();
    }
  }
};

// MENSAJES
export const MessageQueries = {


  getAllMessages: async () => {
    await acquireLock();
    try {
      return await db.getAllAsync('SELECT * FROM messages');
    } finally {
      releaseLock();
    }
  },

  saveMessage: async (msg) => {
    await acquireLock();
    try {

      console.log("MENSAJE EN DB : " + JSON.stringify(msg));
      await db.withTransactionAsync(async () => {
        // 1. Insertar o Actualizar el mensaje
        await db.runAsync(
          `INSERT INTO messages (id, conversationId, senderId, content, createdAt, status, isSynced, type) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET 
             status = excluded.status,
             isSynced = excluded.isSynced,
             content = excluded.content`,
          [
            msg.messageId,
            msg.conversationId,
            msg.senderId,
            msg.content,
            msg.createdAt,
            msg.status,
            msg.isSynced ?? 0,
            msg.type
          ]
        );

        // 2. Actualizar la previsualización
        await db.runAsync(
          `UPDATE conversations SET lastMessageText = ?, updatedAt = ? WHERE id = ?`,
          [msg.content, msg.createdAt, msg.conversationId]
        );
      });
    } catch (e) {
      console.error("Error en saveMessage", e);
      throw e;
    } finally {
      releaseLock();
    }
  },

  saveBatchMessages: async (messagesArray) => {
    await acquireLock();
    try {
      await db.withTransactionAsync(async () => {
        for (const m of messagesArray) {
          await db.runAsync(
            `INSERT OR IGNORE INTO messages (id, conversationId, senderId, content, createdAt, status, isSynced, type) 
             VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
            [m.id, m.conversationId, m.senderId, m.content, m.createdAt, m.status || 'received', m.type]
          );
        }
      });
    } finally {
      releaseLock();
    }
  },

  getMessagesByChat: async (chatId, limit = 50, offset = 0) => {
    await acquireLock();
    try {
      return await db.getAllAsync(
        `SELECT * FROM messages WHERE conversationId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
        [chatId, limit, offset]
      );
    } finally {
      releaseLock();
    }
  },

  getUnsyncedMessages: async () => {
    await acquireLock();
    try {
      return await db.getAllAsync(
        "SELECT * FROM messages WHERE isSynced = 0 AND status = 'pending' ORDER BY createdAt ASC"
      );
    } finally {
      releaseLock();
    }
  },

  markAsSynced: async (id) => {
    await acquireLock();
    try {
      await db.runAsync('UPDATE messages SET isSynced = 1 WHERE id = ?', [id]);
    } catch (e) {
      console.error("Error en markAsSynced", e);
      throw e;
    } finally {
      releaseLock();
    }
  },

  updateMessageStatus: async (data) => {
    const { messageId, status } = data;
    await acquireLock();
    try {
      const result = await db.getFirstAsync("SELECT status FROM messages WHERE id = ?", [messageId]);

      if (result) {
        const current = result.status;
        let shouldUpdate = false;

        // IF 1: De 'pending' se puede pasar a cualquier cosa (menos a sí mismo)
        if (current === 'pending' && status !== 'pending') {
          shouldUpdate = true;
        }
        // IF 2: De 'sent' solo se puede pasar a 'delivered' o 'read'
        else if (current === 'sent' && (status === 'received' || status === 'read')) {
          shouldUpdate = true;
        }
        // IF 3: De 'delivered' solo se puede pasar a 'read'
        else if (current === 'received' && status === 'read') {
          shouldUpdate = true;
        }

        // Ejecutamos la actualización solo si cumplió alguna condición
        if (shouldUpdate) {
          console.log("ACTUALIZANDO MENSAJE: " + messageId + " A ESTADO: " + status);
          await db.runAsync("UPDATE messages SET status = ? WHERE id = ?", [status, messageId]);
        }
      }
    } finally {
      releaseLock();
    }
  },

  // updateMessageStatus: async (data) => {
  //   const { messageId, status } = data;
  //   await acquireLock();
  //   try {
  //     await db.runAsync("UPDATE messages SET status = ? WHERE id = ?", [status, messageId]);
  //   } finally {
  //     releaseLock();
  //   }
  // },

  markChatAsRead: async (chatId) => {
    await acquireLock();
    try {
      await db.runAsync("UPDATE messages SET status = 'read' WHERE conversationId = ? AND status != 'read'", [chatId]);
    } finally {
      releaseLock();
    }
  },

  getMessageById: async (messageId) => {
    await acquireLock();
    try {
      return await db.getFirstAsync("SELECT * FROM messages WHERE id = ?", [messageId]);
    } finally {
      releaseLock();
    }
  }
};