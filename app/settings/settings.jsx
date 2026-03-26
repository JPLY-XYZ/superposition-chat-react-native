import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

// Componentes locales
import GlitchText from 'components/glicthText';
import QuantumToggle from 'components/QuantumToggle';
import { useAuth } from 'context/AuthContext';

// Tus utilidades de persistencia y servicios
import { getSettings, saveSettings } from 'lib/auth/storage';
import { notificationService } from 'lib/utils';

const SettingsScreen = () => {
    const { user, logout, token } = useAuth();
    const [notifications, setNotifications] = useState(true);
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [settings, setSettings] = useState({});

    // Estado para el modal de confirmación
    const [confirmVisible, setConfirmVisible] = useState(false);
    const [confirmConfig, setConfirmConfig] = useState({
        title: '',
        message: '',
        type: 'error',
        onConfirm: () => { }
    });

    // --- CARGA INICIAL ---
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                // 1. Cargamos ajustes del Storage Local (incluye el MODE)
                const localSettings = await getSettings();
                setSettings(localSettings);

                // Aplicamos el modo visual guardado localmente
                setIsDarkMode(localSettings.MODE === 'dark');

                // 2. Cargamos ajustes del Servidor (Solo Notificaciones)
                if (token) {
                    try {
                        const serverData = await notificationService.getNotificationSettings(token);
                        setNotifications(serverData.notifications);
                        // Sincronizamos el booleano local con el del servidor
                        await saveSettings({ ...localSettings, NOTIFICATIONS: serverData.notifications });
                    } catch (e) {
                        // Si el server falla, usamos el backup local
                        setNotifications(localSettings.NOTIFICATIONS);
                    }
                } else {
                    setNotifications(localSettings.NOTIFICATIONS);
                }
            } catch (error) {
                console.error("SETTINGS | Error al cargar:", error);
            }
        };
        loadInitialData();
    }, []);

    // --- MANEJADORES DE CAMBIOS ---

    const handleNotificationChange = async (value) => {
        setNotifications(value);
        try {
            const current = await getSettings();
            // 1. Actualizar Local
            await saveSettings({ ...current, NOTIFICATIONS: value });
            // 2. Actualizar Nodo (Servidor)
            if (token) {
                await notificationService.updateNotificationSettings(token, value);
            }
        } catch (error) {
            console.error("SETTINGS | Error en notificaciones:", error);
        }
    };

    const handleModeChange = async (value) => {
        setIsDarkMode(value);
        try {
            const current = await getSettings();
            const newMode = value ? 'dark' : 'light';

            // ACTUALIZACIÓN ESTRICTAMENTE LOCAL
            await saveSettings({
                ...current,
                MODE: newMode
            });

            console.log("Modo visual actualizado localmente:", newMode);
        } catch (error) {
            console.error("SETTINGS | Error guardando modo local:", error);
        }
    };

    // --- PROTOCOLOS DE BORRADO ---
    const triggerWipeLocal = () => {
        setConfirmConfig({
            title: "WIPE_LOCAL",
            message: "Se eliminarán todos los datos del terminal y se cerrará la sesión actual. ¿Proceder?",
            type: 'info',
            onConfirm: async () => {
                await AsyncStorage.clear();
                await logout();
            }
        });
        setConfirmVisible(true);
    };

    const triggerWipeServer = () => {
        setConfirmConfig({
            title: "PURGE_SERVER",
            message: "ATENCIÓN: Se eliminará tu identidad digital del nodo central de forma irreversible.",
            type: 'error',
            onConfirm: async () => {
                // Aquí iría la llamada a borrar cuenta en el nodo
                await logout();
            }
        });
        setConfirmVisible(true);
    };

    // Estilos del Modal
    const isError = confirmConfig.type === 'error';
    const accentHex = isError ? '#FF00FF' : '#00FFFF';
    const accentBorder = isError ? 'border-[#FF00FF]' : 'border-[#00FFFF]';
    const accentBg = isError ? 'bg-[#FF00FF]' : 'bg-[#00FFFF]';

    return (
        <View className="flex-1 bg-[#0A0E1A]">

            <Modal visible={confirmVisible} transparent animationType="fade">
                <View className="flex-1 justify-center items-center bg-[#0A0E1A]/90 px-8">
                    <View
                        style={{ shadowColor: accentHex, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 15 }}
                        className={`bg-[#0A0E1A] w-full p-8 rounded-3xl border-[1.5px] ${accentBorder}`}
                    >
                        <View className="mb-4">
                            <GlitchText className="text-center">{confirmConfig.title}</GlitchText>
                        </View>
                        <Text className="text-slate-300 text-base mb-8 text-center leading-6 font-medium">
                            {confirmConfig.message}
                        </Text>
                        <View className="flex-row space-x-3">
                            <TouchableOpacity
                                onPress={() => setConfirmVisible(false)}
                                className="flex-1 border border-slate-700 py-4 rounded-2xl items-center"
                            >
                                <Text className="text-slate-500 font-bold tracking-widest text-[10px]">ABORTAR</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => {
                                    setConfirmVisible(false);
                                    confirmConfig.onConfirm();
                                }}
                                className={`flex-1 ${accentBg} py-4 rounded-2xl items-center`}
                            >
                                <Text className="text-[#0A0E1A] font-black tracking-widest text-[10px]">CONFIRMAR</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <ScrollView className="flex-1 p-6 mt-10" contentContainerStyle={{ paddingBottom: 150 }}>
                <View className="items-center mb-8 mt-4">
                    <GlitchText>CONFIGURAcion</GlitchText>
                </View>

                {/* --- SECCIÓN CONEXIÓN --- */}
                <Text className="text-cyan-500/50 text-[10px] uppercase font-bold tracking-[2px] mb-2 px-1">Estado de Red</Text>
                <View className="bg-[#0D1526] rounded-2xl p-4 mb-6 border border-slate-800">
                    <View className="flex-row justify-between items-center opacity-80">
                        <View>
                            <Text className="text-slate-500 text-[10px] uppercase font-bold mb-1">Nodo Activo</Text>
                            <Text className="text-slate-300 font-mono text-xs">{settings.API_URL || 'Buscando nodo...'}</Text>
                        </View>
                        <Ionicons name="lock-closed-outline" size={16} color="#334155" />
                    </View>
                </View>

                {/* --- SECCIÓN PREFERENCIAS (Local + Server) --- */}
                <Text className="text-cyan-500/50 text-[10px] uppercase font-bold tracking-[2px] mb-2 px-1">Preferencias</Text>
                <View className="bg-[#0D1526] rounded-2xl p-4 mb-6 border border-slate-800">
                    <View className="flex-row justify-between items-center py-3 border-b border-slate-800/50">
                        <Text className="text-slate-300">Notificaciones</Text>
                        <QuantumToggle value={notifications} onChange={handleNotificationChange} labelLeft="OFF" labelRight="ON" />
                    </View>
                    <View className="flex-row justify-between items-center py-3">
                        <Text className="text-slate-300">Modo Visual</Text>
                        <QuantumToggle value={isDarkMode} onChange={handleModeChange} labelLeft="LIGHT" labelRight="DARK" activeColor="#FF00FF" />
                    </View>
                </View>

                {/* --- SECCIÓN IDENTIDAD --- */}



            </ScrollView>

            {/* --- BOTÓN CERRAR --- */}
            <View className="absolute bottom-10 left-0 right-0 items-center justify-center">
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => router.back()}
                    style={{ backgroundColor: '#00FFFF', padding: 15, borderRadius: 100, elevation: 10 }}
                >
                    <Ionicons name="close-outline" size={24} color="#0A0E1A" />
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default SettingsScreen;