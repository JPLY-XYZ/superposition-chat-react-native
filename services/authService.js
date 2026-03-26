import { getSettings } from "lib/auth/storage";
import { generateAndStoreKeyPair } from "./cryptoService";

export const authService = {
  login: async (email, password) => {

    const { API_URL } = await getSettings();

    const publicKey = await generateAndStoreKeyPair();


    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, publicKey }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error en el login');
      }

      return data; // Devuelve { token, userId }
    } catch (error) {
      throw error;
    }
  },


  register: async (email, password) => {
    try {      const { API_URL } = await getSettings();

      const publicKey = await generateAndStoreKeyPair();

      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, publicKey }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error en el registro');
      }

      return data; // Devuelve { message(confirmacion), userId}
    } catch (error) {
      throw error;
    }
  },
};