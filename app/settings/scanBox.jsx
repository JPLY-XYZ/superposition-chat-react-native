import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ActivityIndicator, Image, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { usersService } from 'services/usersService';
import { useAuth } from 'context/AuthContext';
import { UserQueries } from 'lib/database/db';

export default function QRScannerScreen({ onScan }) {
  const [permission, requestPermission] = useCameraPermissions();
  const { token } = useAuth();

  // ESTADOS
  const [scannedData, setScannedData] = useState(null);
  const [typeData, setTypeData] = useState(null);

  // Información traída del servidor para mostrar en el modal
  const [userData, setUserData] = useState(null);

  // Estados de carga separados
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Busca datos apenas se escanea
  useEffect(() => {
    // Busca datos apenas se escanea
    const fetchUserPreview = async () => {
      if (!scannedData || !token) return;

      if (typeData === 'user') {
        setIsLoadingUser(true);
        try {
          const user = await usersService.getUserFromServer(token, { code: scannedData });
          if (user) {
            setUserData(user);
          } else {
            handleCancelModal();
          }
        } catch (error) {
          console.error("SCANBOX - fetchUserPreview - getUserFromServer:", error);
          handleCancelModal();
        } finally {
          setIsLoadingUser(false);
        }
      }
    };

    fetchUserPreview();
  }, [scannedData, typeData, token]);


  // ui permisos
  if (!permission) return <View className="flex-1 bg-[#0A0E1A]" />;
  if (!permission.granted) {
    return (
      <View className="flex-1 bg-[#0A0E1A] justify-center items-center p-8">
        <StatusBar style="light" />
        <Text className="text-gray-300 text-center mb-8">Requiere acceso a cámara.</Text>
        <TouchableOpacity className="bg-cyan-500/20 py-4 px-10 rounded-full border border-cyan-500" onPress={requestPermission}>
          <Text className="text-cyan-400 font-bold">HABILITAR SENSOR</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // lógica escaneo
  const handleBarCodeScanned = ({ data }) => {
    if (scannedData) return; // Evita lecturas múltiples

    console.log("Datos escaneados:", data);

    //obtenemos solo el codifo del qr
    const parts = data.split(":");

    if (parts.length >= 2) {
      // Formato esperado "tipo:codigo:stringAleatoria40Chars"
      setTypeData(parts[0]);
      setScannedData(parts[1]);
    } else {
      // Formato simple o desconocido
      setTypeData("unknown");
      setScannedData(data);
    }
  };

  // lógica confirmar
  const handleConfirmSync = async () => {
    setIsProcessing(true);
    try {
      if (typeData === "user" && userData) {
        // Guardado local
        await UserQueries.upsertUser({
          id: userData.id,
          displayName: userData.displayName,
          imageUrl: userData.image_url,
          isMe: 0,
          code: userData.code,
          publicKey: userData.public_key,
        });

        if (onScan) onScan(scannedData);
        handleCancelModal();
        router.back();
      } else {

        //TODO: implementar lógica para otros tipos de datos (si existen)
        handleCancelModal();
        router.back();
      }
    } catch (error) {
      console.error("ERROR EN QRSCANNER - handleConfirmSync:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelModal = () => {
    setScannedData(null);
    setTypeData(null);
    setUserData(null);
    setIsLoadingUser(false);
  };

  return (
    <View className="flex-1 bg-[#0A0E1A]">
      <StatusBar style="light" />
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        onBarcodeScanned={scannedData ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
      />

      {/* OVERLAY VISUAL */}
      <View className="absolute inset-0 bg-[#0A0E1A]/60 justify-center items-center">
        <View className="w-72 h-72 border border-cyan-500/30 bg-cyan-500/5 rounded-xl relative">
          {/* Esquinas decorativas */}
          <View className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-cyan-400 -mt-1 -ml-1 rounded-tl-lg" />
          <View className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-cyan-400 -mt-1 -mr-1 rounded-tr-lg" />
          <View className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-cyan-400 -mb-1 -ml-1 rounded-bl-lg" />
          <View className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-cyan-400 -mb-1 -mr-1 rounded-br-lg" />
        </View>
        <Text className="text-cyan-200 mt-8 text-xs font-bold tracking-[4px] uppercase opacity-80">Buscando firma...</Text>

        {!scannedData && (
          <TouchableOpacity onPress={() => router.back()} className="absolute bottom-16 bg-black/40 border border-cyan-500/50 py-3 px-8 rounded-full">
            <Text className="text-cyan-400 font-bold text-xs tracking-widest">CANCELAR</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* MODAL */}
      <Modal animationType="fade" transparent={true} visible={!!scannedData} onRequestClose={handleCancelModal}>
        <View className="flex-1 justify-center items-center bg-black/90 px-6">
          <View className="w-full max-w-sm bg-[#0F1423] border border-cyan-500/60 rounded-2xl p-6">

            {/* Si está cargando datos de la API */}
            {isLoadingUser ? (
              <View className="py-10 items-center">
                <ActivityIndicator size="large" color="#22d3ee" />
                <Text className="text-cyan-500/50 mt-4 text-xs tracking-widest uppercase">Decodificando identidad...</Text>
              </View>
            ) : (
              <>
                {/* CONTENIDO DEL MODAL */}
                {typeData === "user" && userData ? (
                  <View className="bg-[#121b2e] w-full p-4 rounded-2xl border border-cyan-500/30 flex-row items-center mb-6">
                    <Image
                      source={{ uri: userData.imageUrl || 'https://via.placeholder.com/150' }}
                      className="w-16 h-16 rounded-full border-2 border-cyan-400"
                    />
                    <View className="ml-4 flex-1">
                      <Text className="text-cyan-500/80 text-[10px] uppercase tracking-widest font-bold">Identidad Detectada</Text>
                      <Text className="text-white font-bold text-xl" numberOfLines={1}>{userData.displayName}</Text>
                    </View>
                  </View>
                ) : (
                  <View className="bg-[#121b2e] p-4 rounded-lg mb-6 items-center">
                    <Text className="text-white font-mono font-bold text-lg">{scannedData}</Text>
                    <Text className="text-gray-500 text-[10px] uppercase mt-1">Dato crudo</Text>
                  </View>
                )}

                {/* BOTONES */}
                <View className="flex-row gap-4">
                  <TouchableOpacity
                    className="flex-1 py-3 rounded-xl border border-gray-700 items-center"
                    onPress={handleCancelModal}
                    disabled={isProcessing}
                  >
                    <Text className="text-gray-400 font-bold text-xs">CANCELAR</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className={`flex-1 py-3 rounded-xl items-center border ${typeData === 'user' && !userData ? 'bg-gray-700 border-gray-600' : 'bg-cyan-600 border-cyan-400'}`}
                    onPress={handleConfirmSync}
                    // Deshabilitar si es usuario pero no cargó la data, o si está procesando
                    disabled={isProcessing || (typeData === 'user' && !userData)}
                  >
                    {isProcessing ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text className={`font-bold text-xs ${typeData === 'user' && !userData ? 'text-gray-500' : 'text-white'}`}>
                        CONFIRMAR
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}