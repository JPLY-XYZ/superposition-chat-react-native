import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useSocket } from "context/SocketContext";
import GlitchText from "components/glicthText";

export default function ChatsHeader() {
  const insets = useSafeAreaInsets();

  const { online } = useSocket();

  

  return (
    <View 
      style={{ paddingTop: insets.top, backgroundColor: '#020617', borderBottomWidth: 1, borderBottomColor: '#1e293b' }} 
    >
      <View className="flex-row justify-between items-center px-5 pb-4">
        
        {/* TÍTULO: Blanco, negrita y con un poco de espaciado (tracking) para toque moderno */}
        <GlitchText className="text-white text-xl font-bold tracking-wide">
          SUPERPOSITION CHAT
        </GlitchText>

<TouchableOpacity 
        onPress={() => {
          online ? router.push({
            pathname: "/settings/scanBox",
            params: { id: 123 } 
          }) : null;
        }}
          activeOpacity={0.7}
          style={{ 
            padding: 8, 
            borderRadius: 20, 
            backgroundColor: 'rgba(255, 255, 255, 0.05)' 
          }}
        >
          {/* ICONO: Color Cian Eléctrico (#00FFFF) para el acento de marca */}
          <Ionicons name="camera-outline" size={22} color={online ? '#00FFFF' : '#999'} />
        </TouchableOpacity>

      </View>
    </View>
  );
}