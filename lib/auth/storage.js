// lib/auth/storage.js
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'user_session_token';

export const tokenStorage = {
    save: async (token) => {
        try {
            await SecureStore.setItemAsync(TOKEN_KEY, token);
        } catch (e) {
            console.error("Error saving token", e);
        }
    },
    get: async () => {
        try {
            return await SecureStore.getItemAsync(TOKEN_KEY);
        } catch (e) {
            return null;
        }
    },
    clear: async () => {
        try {
            await SecureStore.deleteItemAsync(TOKEN_KEY);
        } catch (e) {
            console.error("Error clearing token", e);
        }
    }
};