export const messagesService = {
changeMessageStatus: async (token, messageId, status) => {
        try {

            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/messages/changeStatus`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ messageId: messageId, status: status }),
            });

            const data = await response.json();
            if (response.status === 404) {
                return null;
            }
            if (!response.ok) {
                throw new Error(data.error);
            }

            return data;
        } catch (error) {
            console.log("ERROR EN MESSAGE SERVICE", error);
            throw error;
        }
    },

    getUnReceivedMessages: async (token) => {
    try {
        const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/messages/getUnReceivedMessages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: {}
        });

        // 1. Manejamos el 404 (o 204 No Content) antes de intentar parsear el JSON
        if (response.status === 404) {
            console.log("NO HAY MENSAJES NO LEIDOS");
            return []; // Es mejor devolver un array vacío [] que null para evitar errores en .map()
        }

        const data = await response.json();

        // 2. Manejamos otros errores de la API
        if (!response.ok) {
            throw new Error(data.error || 'Error desconocido');
        }

        return data; // Aquí llegará el array de statuses con sus mensajes
    } catch (error) {
        console.error("ERROR EN MESSAGE SERVICE:", error);
        throw error;
    }
},

getUserServerUnsyncedMessages: async (token, lastMessageSyncedDate) => {
        try {
            // Pasamos el contactId en la URL usando ?contactId=...
            const response = await fetch(
                `${process.env.EXPO_PUBLIC_API_URL}/messages/sync/?lastMess=${lastMessageSyncedDate}`, 
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                }
            );

            const data = await response.json();
            
            if (response.status === 404) return null;
            if (!response.ok) throw new Error(data.error);

            return data;
        } catch (error) {
            console.log("ERROR EN MESSAGE SERVICE", error);
            throw error;
        }
    },

};