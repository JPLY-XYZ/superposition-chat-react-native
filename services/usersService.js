import { getSettings } from "lib/auth/storage";
import { revisarConexion } from "lib/utils";

export const usersService = {
  updateUser: async (token, displayName, imageUrl) => {
    try {
      const { API_URL } = await getSettings();
      const response = await fetch(`${API_URL}/users/update_me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ displayName, imageUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al actualizar el perfil');
      }

      return data;
    } catch (error) {
      throw error;
    }
  },

  getUserFromServer: async (token, { id, code } = {}) => {

    const { API_URL } = await getSettings();

    const hayInternet = await revisarConexion();

    if (!hayInternet) {
      throw new Error('No hay internet');
    }
    try {

      let body = {};

      if (!id) {
        body = { code };
      }
      else if (!code) {
        body = { id };
      }


      const response = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();


      if (!response.ok) {
        console.error("ERROR EN USERS SERVICE - getUserFromServer", response);
      }

      return data;
    } catch (error) {
      console.error("ERROR EN USERS SERVICE - getUserFromServer", error);
      throw error;
    }
  },

  getUserById: async (token, id) => {
    try {
      const { API_URL } = await getSettings();
      const response = await fetch(`${API_URL}/users/get_user_by_id`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId: id }),
      });

      const data = await response.json();

      console.log("datos del usuario", data);

      if (!response.ok) {
        throw new Error(data.error || 'Error al obtener el usuario');
      }

      return data;
    } catch (error) {
      console.log("error al obtener el usuario", error);
      throw error;
    }
  },

  getUserByCode: async (token, code) => {
    try {
      const { API_URL } = await getSettings();
      const response = await fetch(`${API_URL}/users/validate_contact_code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ contactCode: code }),
      });

      const data = await response.json();

      console.log("datos del usuario validarrrrr", data);

      if (!response.ok) {
        throw new Error(data.error || 'Error al obtener el usuario');
      }

      return data;
    } catch (error) {
      console.log("error al obtener el usuario", error);
      throw error;
    }
  },

  getMeFromServer: async (token) => {
    try {
      const { API_URL } = await getSettings();
      const response = await fetch(
        `${API_URL}/users/get_me`,
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
      console.error("ERROR EN USERS SERVICE - getMeFromServer", error);
      throw error;
    }
  },

  setPushToken: async (token, pushToken) => {
    try {
      const { API_URL } = await getSettings();
      const response = await fetch(
        `${API_URL}/users/upsert_push_token`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ pushToken })
        }
      );

      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      return data;
    } catch (error) {
      console.error("ERROR EN USERS SERVICE - setPushToken", error);
      throw error;
    }
  },



};