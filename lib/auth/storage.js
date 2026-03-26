// lib/auth/storage.js
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = 'APP_SETTINGS';

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

export const getSettings = async () => {
    try {
        const data = await AsyncStorage.getItem(SETTINGS_KEY);
        const parsed = data ? JSON.parse(data) : {};

        // Devolvemos los campos específicos con valores por defecto
        return {
            API_URL: parsed.API_URL || '',
            WS_URL: parsed.WS_URL || '',
            NOTIFICATIONS: parsed.NOTIFICATIONS ?? true, // true por defecto
            MODE: parsed.MODE || 'dark',
            ...parsed // Mantenemos otros posibles ajustes
        };
    } catch (e) {
        console.error("Error al recuperar ajustes:", e);
        // Devolvemos objeto vacío para evitar errores al desestructurar en el catch
        return {};
    }
};

export const saveSettings = async (settings) => {
    try {
        await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        return true;
    } catch (e) {
        console.error("Error al guardar ajustes:", e);
        return false;
    }
};