import { AuthProvider, useAuth } from "context/AuthContext";
import { SocketProvider, useSocket } from "context/SocketContext";
import "../global.css";
import { router, Stack, useSegments } from 'expo-router';
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { initDB } from "lib/database/db";
import { messagesService } from "services/messageService";
import { SyncProvider } from "context/SyncContext";
import { usersService } from "services/usersService";
import { revisarConexion } from "lib/utils";
import * as Notifications from 'expo-notifications';
import AsyncStorage from "@react-native-async-storage/async-storage";


function RootLayoutNav() {
  const { user, loading, token, setUser } = useAuth();
  const { online } = useSocket();
  const segments = useSegments();


  //Inicializamos la base de datos
  initDB();

  //Ejecutamos la logica de autenticacion al entrar a la app
  useEffect(() => {
    if (loading) return;

    const checkAuthAndProfile = async () => {
      //Comprobamos si estamos en la pantalla de autenticacion
      const inAuthScreen = segments[0] === 'settings' && segments[1] === 'auth';

      //Comprobamos si estamos en la pantalla de nuevo perfil
      const inNewProfileScreen = segments[0] === 'settings' && segments[1] === 'newProfile';

      //Si no hay usuario, redirigimos a la pantalla de autenticacion

      if (!user) {
        if (!inAuthScreen) router.replace('/settings/auth');
        return;
      }

      //Declaramos la variable fuera para poder rellenarla en ambos casos
      let OnlineUser = null;

      const hayInternet = await revisarConexion();

      //CASO ONLINE(hay internet y se ha conectado al socket): Intentamos buscar en el servidor
      if (online && hayInternet) {
        try {
          OnlineUser = await usersService.getUserFromServer(token, { id: user.id });

          //actualizamos el estado local si hace falta
          if (OnlineUser) {
            const hasChanged =
              user.displayName !== OnlineUser.displayName ||
              user.imageUrl !== OnlineUser.imageUrl;

            if (hasChanged) {
              setUser((prevUser) => ({
                ...prevUser,
                displayName: OnlineUser.displayName,
                imageUrl: OnlineUser.imageUrl,
              }));
            }
          }

        } catch (e) {
          console.log("Fallo al conectar con server, usando local", e);
        }
      }

      //CASO OFFLINE(no hay internet o no se ha conectado al socket): usamos datos locales
      if (!OnlineUser) {
        OnlineUser = user;
      }

      const profileComplete = OnlineUser.displayName && OnlineUser.imageUrl;

      if (!profileComplete) {
        if (!inNewProfileScreen) {
          router.replace('/settings/newProfile');
        }
      } else {
        if (inAuthScreen || inNewProfileScreen) {
          router.replace('/(tabs)/chats');
        }
      }
    };

    checkAuthAndProfile();
    registerForPushNotifications();



  }, [user?.id, loading, segments]);


  //Configuramos las notificaciones

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true, // Muestra la alerta visual
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  async function registerForPushNotifications() {
    // 1. Pedir permiso al usuario
    const { status } = await Notifications.requestPermissionsAsync();

    if (status !== 'granted') {
      alert('¡Se necesitan permisos para notificaciones!');
      return;
    }

    // 2. Obtener el token único del dispositivo
    // (Necesitas un projectId en app.json si usas EAS, si no, dejalo vacío)
    const tokenData = await Notifications.getExpoPushTokenAsync();

    const hayInternet = await revisarConexion();

    if (online && hayInternet) {
      await usersService.setPushToken(token, tokenData.data);
    }
  }


  useEffect(() => {
  // Guardamos la fecha actual cada 10 segundos
  const intervalo = setInterval(() => {
    AsyncStorage.setItem('@lastConexionTimestamp', String(Date.now()));
  }, 10000);

  return () => clearInterval(intervalo);
}, []);


  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' }}>
        <ActivityIndicator size="large" color="#00FFFF" />
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="settings/auth" options={{ headerTitle: "AUTH", headerShown: false }} />
      <Stack.Screen name="settings/settings" options={{ headerTitle: "Settings" }} />
      <Stack.Screen name="settings/newProfile" options={{ headerShown: false }} />
      <Stack.Screen name="settings/scanBox" options={{ headerShown: false }} />
      <Stack.Screen
        name="chat/[id]"
        options={{
          headerShown: false,
          title: 'Chat',
          headerStyle: { backgroundColor: '#020617' },
          headerTintColor: '#fff'
        }}
      />
      <Stack.Screen
        name="chat/newChat"
        options={{
          title: 'Contactos',
          headerStyle: { backgroundColor: '#020617' },
          headerTintColor: '#fff'
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <SocketProvider>
        <SyncProvider>
          <RootLayoutNav />
        </SyncProvider>
      </SocketProvider>
    </AuthProvider>
  );
}