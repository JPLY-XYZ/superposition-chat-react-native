import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Easing } from 'react-native';

const PhaseSelector = ({ isLogin, onChange }) => {
  // Animación para mover el bloque (0 para Login, 1 para Signup)
  const moveAnim = useRef(new Animated.Value(isLogin ? 0 : 1)).current;

  useEffect(() => {
    Animated.timing(moveAnim, {
      toValue: isLogin ? 0 : 1,
      duration: 300,
      easing: Easing.out(Easing.back(1.5)), // Efecto de rebote científico
      useNativeDriver: false, // Necesario para animar colores y posiciones no-transform
    }).start();
  }, [isLogin]);

  // Interpolación para el movimiento horizontal
  const left = moveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['2%', '51%'], // Se desplaza de un lado a otro
  });

  // Interpolación para el color del bloque (Cian a Magenta)
  const bgColor = moveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#00FFFF', '#FF00FF'],
  });

  return (
    <View className="bg-[#0A0E1A] border border-slate-800 p-1 rounded-2xl flex-row relative h-14 items-center mb-8">
      
      {/* Bloque de Energía Deslizante */}
      <Animated.View 
        style={{ 
          position: 'absolute',
          left,
          backgroundColor: bgColor,
          width: '47%',
          height: '85%',
          borderRadius: 12,
          shadowColor: bgColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 10,
        }}
      />

      {/* Opción LOGIN */}
      <TouchableOpacity 
        activeOpacity={1}
        onPress={() => onChange(true)}
        className="flex-1 items-center justify-center z-10"
      >
        <Text className={`font-bold tracking-widest ${isLogin ? 'text-[#0A0E1A]' : 'text-slate-500'}`}>
          LOGIN
        </Text>
      </TouchableOpacity>

      {/* Opción SIGNUP */}
      <TouchableOpacity 
        activeOpacity={1}
        onPress={() => onChange(false)}
        className="flex-1 items-center justify-center z-10"
      >
        <Text className={`font-bold tracking-widest ${!isLogin ? 'text-[#0A0E1A]' : 'text-slate-500'}`}>
          SIGNUP
        </Text>
      </TouchableOpacity>

    </View>
  );
};

export default PhaseSelector;