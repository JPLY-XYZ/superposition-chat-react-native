import { View, Text, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "context/AuthContext";
import { useSocket } from "context/SocketContext";

export default function ChatPageHeader({ chat }) {
const {user} = useAuth();


    const insets = useSafeAreaInsets();

    

    // Datos simulados para visualización
    
 const { onlineUserIds } = useSocket();
 
    const isOnline = onlineUserIds.has(chat?.participants?.find(participant => participant !== user?.id));

    return (
        <View
            style={{ paddingTop: insets.top, backgroundColor: '#020617', borderBottomWidth: 1, borderBottomColor: '#1e293b' }}
        >
            <View className="flex-row justify-between items-center px-5 pb-4">

                <View className="flex-row items-center mr-2">
                    <TouchableOpacity className="mr-4" onPress={() => router.push('/chats')} activeOpacity={0.7}>
                        <Ionicons name="arrow-back" size={22} color="#00FFFF" />
                    </TouchableOpacity>

                    <Image source={{ uri: "https://api.dicebear.com/9.x/bottts/png?seed=" + chat?.participants?.find(participant => participant !== user?.id) }} className="w-10 mr-4 h-10 rounded-full" />
                    <View>
                        <Text className="text-white text-xl font-bold tracking-wide">
                            {chat?.name.toUpperCase()}
                        </Text>
                        <Text className="text-cyan-400 font-bold text-xs tracking-wide">
                           {isOnline ? 'Online' : 'Offline'}
                        </Text>
                    </View>
                </View>

                {/* <TouchableOpacity
                    activeOpacity={0.7}
                    style={{
                        padding: 8,
                        borderRadius: 20,
                        backgroundColor: 'rgba(255, 255, 255, 0.05)'
                    }}
                >
                    <Ionicons name="settings-outline" size={22} color="#00FFFF" />
                </TouchableOpacity> */}

            </View>
        </View>
    );
}