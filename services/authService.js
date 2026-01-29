import { setClavePrivada } from 'lib/utils';

export const authService = {
  login: async (email, password) => {

    console.log("email", email);
    console.log("password", password);

    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error en el login');
      }

      return data; // Devuelve { token, userId, publicKey }
    } catch (error) {
      throw error;
    }
  },

  //solo en entorno de produccion
  // register: async (email, password) => {
  //   try {

  //     const keys = await RSA.generateKeys(2048);


  //     console.log("keys", keys.private);

  //     await setClavePrivada(keys.private);


  //     const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/auth/register`, {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ email, password, publicKey: keys.public }),
  //     });

  //     const data = await response.json();

  //     if (!response.ok) {
  //       throw new Error(data.error || 'Error en el registro');
  //     }

  //     return data; // Devuelve { message(confirmacion), userId}
  //   } catch (error) {
  //     throw error;
  //   }
  // },

  register: async (email, password) => {
    try {

      // await setClavePrivada("clave-privada");


      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, publicKey: "clave-publica" }),
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