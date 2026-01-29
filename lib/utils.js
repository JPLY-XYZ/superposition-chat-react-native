import * as Crypto from 'expo-crypto';
import NetInfo from "@react-native-community/netinfo";
import * as Keychain from 'react-native-keychain';

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



export const revisarConexion = async () => {
  const state = await NetInfo.fetch();
  return state.isConnected; // Ahora sí devuelve true/false
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