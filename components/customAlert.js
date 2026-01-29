import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import GlitchText from './glicthText';

const CustomAlert = forwardRef((props, ref) => {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState({ title: '', message: '', type: 'error' });

  useImperativeHandle(ref, () => ({
    show: (title, message, type = 'error') => {
      setConfig({ title, message, type });
      setVisible(true);
    },
    hide: () => setVisible(false)
  }));

  // Mapeo de colores según la filosofía "Cyber-Physics"
  // Error -> Magenta | Info/Success -> Cyan
  const isError = config.type === 'error';
  const accentHex = isError ? '#FF00FF' : '#00FFFF'; // Magenta vs Cyan
  const accentBorder = isError ? 'border-[#FF00FF]' : 'border-[#00FFFF]';
  const buttonBg = isError ? 'bg-[#FF00FF]' : 'bg-[#00FFFF]';

  return (
    <Modal visible={visible} transparent animationType="fade">
      {/* Fondo con desenfoque visual (Overlay) */}
      <View className="flex-1 justify-center items-center bg-[#0A0E1A]/80 px-8">
        
        {/* Contenedor Principal: Azul Marino Profundo */}
        <View 
          style={{ shadowColor: accentHex, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 15 }}
          className={`bg-[#0A0E1A] w-full p-8 rounded-3xl border-[1.5px] ${accentBorder}`}
        >
          
          {/* Título: Efecto Glitch */}
          <View className="mb-4">
            <GlitchText className="text-center">
              {config.title.toUpperCase()}
            </GlitchText>
          </View>
          
          {/* Mensaje: Gris claro para legibilidad de laboratorio */}
          <Text className="text-slate-300 text-base mb-8 text-center leading-6 font-medium">
            {config.message}
          </Text>

          {/* Botón de Acción: Colapsa la onda */}
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={() => setVisible(false)}
            className={`${buttonBg} py-4 rounded-2xl items-center shadow-lg`}
          >
            <Text className="text-[#0A0E1A] font-black text-lg tracking-widest">
              CONFIRMAR ESTADO
            </Text>
          </TouchableOpacity>
          
        </View>
      </View>
    </Modal>
  );
});

export default CustomAlert;