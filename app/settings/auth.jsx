import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import LoginComponent from 'components/auth/LoginComponent';
import SingUpComponent from 'components/auth/SingUpComponent';
import GlitchText from 'components/glicthText';
import PhaseSelector from 'components/PhaseSelector';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <View className="flex-1 justify-center p-8 bg-[#0A0E1A]">
      
      {/* 1. Título con Efecto Glitch y Subtítulo de Laboratorio */}
      <View className="mb-12 items-center">
        <GlitchText>
          SUPERPOSITION CHAT
        </GlitchText>
        <Text className="text-cyan-500/50 text-xs tracking-[4px] mt-2 font-mono">
          SECURE_QUANTUM_PROTOCOL
        </Text>
      </View>

      {/* 2. Contenedor del Formulario con Borde de Estado */}
      <View 
        style={{ 
          shadowColor: isLogin ? '#00FFFF' : '#FF00FF', 
          shadowOffset: { width: 0, height: 0 }, 
          shadowOpacity: 0.2, 
          shadowRadius: 20 
        }}
        className={`p-6 rounded-3xl border-[1px] bg-[#0A0E1A] ${isLogin ? 'border-cyan-500/30' : 'border-magenta-500/30'}`}
      >
        {/* Renderizado Condicional de Componentes */}
        {isLogin ? <LoginComponent /> : <SingUpComponent />}
      </View>

      {/* 3. Selector de Fase (Toggle) */}
      <TouchableOpacity 
        activeOpacity={0.7}
        onPress={() => setIsLogin(!isLogin)}
        className="mt-8 py-4"
      >
        
         
          
        <PhaseSelector isLogin={isLogin} onChange={setIsLogin} />
        
        

      </TouchableOpacity>

      {/* 4. Footer Decorativo */}
      <View className="absolute bottom-10 left-0 right-0 items-center">
        <Text className="text-slate-700 text-[10px] font-mono tracking-widest uppercase">
          Status: Awaiting Observation 
        </Text>
      </View>

    </View>
  );
}