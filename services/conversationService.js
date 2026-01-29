
export const conversationService = {
    findExistingConversationOnServer: async (token, contactId) => {
        try {

            console.log("token", token);
            console.log("contactId", contactId);

            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/conversations/getExistingConversation`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ contactId: contactId }),
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
            console.log("ERROR EN CHAT SERVICE", error);
            throw error;
        }
    },

    sendConversationToServer: async (token, conversation) => {
        try {


            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/conversations/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(conversation),
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
            console.log("ERROR EN CHAT SERVICE - sendConversationToServer", error);
            throw error;
        }
    },
    getUserServerUnsyncedChats: async (token, lastConvSyncedDate) => {
        try {
            // Pasamos el contactId en la URL usando ?contactId=...
            const response = await fetch(
                `${process.env.EXPO_PUBLIC_API_URL}/conversations/?lastConv=${lastConvSyncedDate}`, 
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
            console.log("ERROR EN CHAT SERVICE", error);
            throw error;
        }
    },
};