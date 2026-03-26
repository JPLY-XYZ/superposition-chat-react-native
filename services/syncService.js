import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSettings } from "lib/auth/storage";

export const syncService = {

    getUnsyncedDataFromServer: async (token) => {

        const { API_URL } = await getSettings();
        const lastConexionTimestamp = '1970-01-01T00:00:00.000Z';

        try {
            const response = await fetch(
                `${API_URL}/sync/?lastSync=${lastConexionTimestamp}`,
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
            console.log("ERROR EN SYNC SERVICE - getUnsyncedDataFromServer", error);
            throw error;
        }
    },
}