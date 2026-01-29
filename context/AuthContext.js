import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearDatabase, UserQueries } from 'lib/database/db';
import { router } from 'expo-router';
import { usersService } from 'services/usersService';
import { removeClavePrivada } from 'lib/utils';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStorageData = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('@token');

        if (storedToken) {
          //Intentamos obtener el usuario de la base de datos local
          const myProfile = await UserQueries.getMyself();

          //Si hay usuario en la base de datos local, lo logueamos
          if (myProfile) {
            setToken(storedToken);
            setUser(myProfile);
          } else {
            //Si no hay usuario en la base de datos local, limpiamos ese token fantasma
            await AsyncStorage.removeItem('@token');
            setToken(null);
          }
        }
      } catch (e) {
        console.error("AUTH-CONTEXT | ERROR CARGANDO AUTH -> ", e);
      } finally {
        setLoading(false);
      }
    };
    loadStorageData();
  }, []);

  const login = async (user) => {
    try {

      //Guardamos el token en AsyncStorage
      await AsyncStorage.setItem('@token', user.token);


      //Obtenemos el perfil del usuario del servidor
      const userData = await usersService.getMeFromServer(user.token);

      //Guardamos en SQLite y luego actualizamos estado
      await UserQueries.upsertUser({ ...userData, isMe: 1 });

      //Actualizamos estado al final para evitar parpadeos
      setToken(user.token);
      setUser(userData);

    } catch (error) {
      console.error("AUTH-CONTEXT | ERROR EN LOGIN -> ", error);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      //Limpiamos estado primero para feedback visual inmediato
      setToken(null);
      setUser(null);

      //Limpiamos almacenamiento
      await AsyncStorage.removeItem('@token');

      //Limpiamos la clave privada  //TODO: descomentar en produccion
      // await removeClavePrivada();

      //Esperamos a que la DB se limpie
      await clearDatabase();

      //Limpiamos el timestamp de la ultima conexion
      await AsyncStorage.removeItem('@lastConexionTimestamp');

      //Navegamos al final
      router.replace('/settings/auth');


    } catch (e) {
      console.error("AUTH-CONTEXT | ERROR EN LOGOUT -> ", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);