import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router'; 
import { useAuth } from 'context/AuthContext';




export default function Index() {

const { loading } = useAuth();

  // Si hay sesión, usamos el componente declarativo <Redirect />
  // Esto permite a React y Expo manejar el cambio de ruta de forma segura.
  if (!loading) {
    return <Redirect href="/(tabs)/chats" />;
  }
  
  // Si no hay sesión, o si la sesión aún se está cargando (si useAuth lo maneja)
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' }}>
      <ActivityIndicator size="large" color="#00FFFF" />
    </View>
  );
}