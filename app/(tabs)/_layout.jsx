import "../../global.css";
import { Tabs } from 'expo-router';
import { Ionicons } from "@expo/vector-icons";

export default function RootLayout() {


  return (
        <Tabs screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#00FFFF', 
        tabBarInactiveTintColor: '#64748b', 
        tabBarStyle: {
          backgroundColor: '#0d1429ff', 
          borderTopWidth: 1,
          borderTopColor: '#1E293B',  
        },
        tabBarLabelStyle: {
          fontFamily: 'monospace',     
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: 1,
        }
      }}>
        <Tabs.Screen name="chats" options={{ headerShown: false , title: "Conversaciones" , tabBarIcon: ({ color }) => <Ionicons size={28} name="chatbubble-ellipses-outline" color={color} /> }} />
        <Tabs.Screen name="profile" options={{ headerShown: false , title: "Perfil" , tabBarIcon: ({ color }) => <Ionicons size={28} name="person-outline" color={color} /> }} />
      </Tabs>
  );
}