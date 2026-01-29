import React, { useEffect, useState } from 'react';
import { View, Text, Image, TextInput, TouchableOpacity, Animated } from 'react-native';
import { usersService } from 'services/usersService';
import { UserQueries } from 'lib/database/db';
import { useAuth } from 'context/AuthContext';
import { router } from 'expo-router';
import GlitchText from 'components/glicthText';


const ProfileComponent = () => {
    const [displayName, setDisplayName] = useState('');
    const [imageUrl, setImageUrl] = useState("");
    const { token, setUser, user } = useAuth();

    useEffect(() => {
        if (user) {
            // Generamos un avatar basado en el ID para que sea único pero determinista
            setImageUrl("https://api.dicebear.com/9.x/bottts/png?seed=" + user.id);
        }
    }, [user]);

    const handleUpdateUser = async () => {
        if (!displayName.trim()) return; // Podrías disparar un alert custom aquí

        try {
            const data = await usersService.updateUser(token, displayName, imageUrl);

            await UserQueries.upsertUser({
                id: data.id,
                displayName: data.displayName,
                imageUrl: data.imageUrl,
                is_me: 1,
                code: user.code,
                publicKey: user.publicKey
            });

            setUser((prevUser) => ({
                ...prevUser,
                displayName: data.displayName,
                imageUrl: data.imageUrl
            }));

        } catch (error) {
            console.error("PROFILE COMPONENT - update user: ", error);
        } finally {
            router.replace('/(tabs)/chats');
        }
    };

    return (
        <View className="flex-1 justify-center items-center bg-[#0A0E1A] p-8">
            
            {/* 1. Título con Glitch */}
           
                <GlitchText>IDENTIDAD</GlitchText>
            

            {/* 2. Avatar con efecto de "Aura de Datos" */}
            <TouchableOpacity 
                activeOpacity={0.8}
                
                style={{
                    marginTop: 20,
                    marginBottom: 20,
                    shadowColor: '#00FFFF',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.3,
                    shadowRadius: 15,
                }}
            >
                <View className="rounded-full border-2 border-cyan-500/50 p-1">
                    <Image
                        source={{ uri: imageUrl }}
                        className="w-32 h-32 rounded-full bg-[#0D1526]"
                        resizeMode="cover"
                    />
                </View>
                {/* Indicador de estado online/activo decorativo */}
                <View className="absolute bottom-1 right-2 bg-cyan-500 w-6 h-6 rounded-full border-4 border-[#0A0E1A]" />
            </TouchableOpacity>

            {/* 3. Instrucción de laboratorio */}
            <Text className="text-slate-400 mb-10 text-center font-medium leading-5 px-4">
                Define el alias para tu firma digital en la red de la superposición.
            </Text>

            {/* 4. Campo de Entrada Estilizado */}
            <View className="w-full mb-10">
                <View className="flex-row justify-between mb-2 px-1">
                    <Text className="text-cyan-500/70 text-[10px] uppercase font-bold tracking-[2px]">
                        Subject_Name
                    </Text>
                    <Text className="text-slate-600 text-[10px] font-mono">
                        ID: {user?.id?.substring(0, 8) || 'unknown'}
                    </Text>
                </View>
                
                <TextInput
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="Escribe tu alias..."
                    placeholderTextColor="#1E293B"
                    selectionColor="#00FFFF"
                    className="bg-[#0D1526] text-white p-5 rounded-2xl border border-slate-800 focus:border-cyan-500 text-lg font-bold"
                />
            </View>

            {/* 5. Botón de Acción Principal */}
            <TouchableOpacity
                onPress={handleUpdateUser}
                activeOpacity={0.9}
                className="w-full p-5 rounded-2xl items-center bg-cyan-500"
            >
                <Text className="font-black text-slate-950 tracking-[2px] uppercase">
                    Inicializar Protocolo
                </Text>
            </TouchableOpacity>

            {/* Decoración inferior */}
            <View className="mt-8 border-t border-slate-600 w-32 pt-4 items-center">
                <Text className="text-slate-600 text-[12px] font-mono uppercase tracking-widest">
                    V.9.0.Quantum
                </Text>
            </View>

        </View>
    )
}

export default ProfileComponent;