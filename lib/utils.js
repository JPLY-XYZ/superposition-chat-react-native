import * as Crypto from 'expo-crypto';
import NetInfo from "@react-native-community/netinfo";
import * as Keychain from 'react-native-keychain';
import { getSettings } from './auth/storage';

export const getUUID = () => {
  return Crypto.randomUUID();
};

export const generateRandomString = (length = 12) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters.charAt(randomIndex);
  }

  return result;
};


export const notificationService = {
  /**
   * Actualiza la preferencia de notificaciones y el push token en el servidor.
   * endpoint: PUT /notifications
   */
  updateNotificationSettings: async (token, enabled, pushToken = null) => {
    try {
      const { API_URL } = await getSettings();
      if (!API_URL) throw new Error("Nodo no configurado");

      const cleanUrl = API_URL.trim().replace(/\/$/, "");

      const response = await fetch(`${cleanUrl}/users/notifications`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // Token de autenticación
        },
        body: JSON.stringify({
          notifications: enabled,
          pushToken: pushToken // Opcional, por si lo necesitas para FCM/Expo
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar notificaciones');
      }

      return await response.json(); // Devuelve {} según tu esquema
    } catch (error) {
      console.error("NOTIFICATION_SERVICE | PUT ERROR:", error);
      throw error;
    }
  },

  /**
   * Obtiene la configuración de notificaciones guardada en el nodo.
   * endpoint: GET /notifications
   */
  getNotificationSettings: async (token) => {
    try {
      const { API_URL } = await getSettings();

      const response = await fetch(`${API_URL}/users/notifications`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log(response)

      if (!response.ok) {
        throw new Error('Error al obtener estado de notificaciones');
      }

      const data = await response.json();
      // Devuelve { notifications: true/false }
      return data;
    } catch (error) {
      console.error("NOTIFICATION_SERVICE | GET ERROR:", error);
      throw error;
    }
  }
};


export const revisarConexion = async () => {
  try {
    // 1. Comprobar si el dispositivo tiene salida a internet (WiFi/Datos)
    const state = await NetInfo.fetch();
    if (!state.isConnected) {
      console.log("CONEXIÓN: Dispositivo offline");
      return false;
    }

    // 2. Obtener la URL del nodo configurado desde tus ajustes
    const { API_URL } = await getSettings();
    if (!API_URL) {
      console.log("CONEXIÓN: No hay API_URL configurada");
      return false;
    }

    // Limpiamos la URL para evitar errores de doble barra (ej: /api//status)
    const cleanUrl = API_URL.trim().replace(/\/$/, "");

    // 3. Comprobar si el servidor responde (Ping de salud)
    // Usamos un timeout de 5s para que la app no se quede colgada esperando
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${cleanUrl}/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Verificamos que la respuesta HTTP sea exitosa antes de procesar el JSON
    if (!response.ok) {
      console.log("CONEXIÓN: El servidor respondió con error", response.status);
      return false;
    }

    const data = await response.json();

    // Devolvemos true solo si el servidor confirma que está saludable
    return data && data.status === "health";

  } catch (error) {
    if (error.name === 'AbortError') {
      console.log("CONEXIÓN: Tiempo de espera agotado (Timeout)");
    } else {
      console.log("CONEXIÓN: Error al contactar con el servidor ->", error.message);
    }
    return false;
  }
};




// --- GUARDAR la clave privada ---
export const setClavePrivada = async (privateKeyPEM) => {
  await Keychain.setGenericPassword('mi_identidad_rsa', privateKeyPEM);
};

export const removeClavePrivada = async () => {
  await Keychain.resetGenericPassword();
};

// --- LEER la clave privada ---
export const getClavePrivada = async () => {
  try {
    const credentials = await Keychain.getGenericPassword();

    if (credentials) {
      return credentials.password;
    } else {
      return null;
    }
  } catch (error) {
    console.error("ERROR AL OBTENER LA CLAVE PRIVADA", error);
  }
};