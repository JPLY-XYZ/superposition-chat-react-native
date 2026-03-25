import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  useSharedValue, 
  Easing 
} from 'react-native-reanimated';

const WaveBar = ({ index, animValue, isStatic }) => {
  const animatedStyle = useAnimatedStyle(() => {
    if (isStatic) {
      return { height: withTiming(6, { duration: 300 }) };
    }

    // --- EL TRUCO DEL CAOS OPTIMIZADO ---
    // Mezclamos dos ondas senoidales con diferentes velocidades y fases.
    // Usamos el índice de la barra para desfasar cada una.
    
    // Onda 1: Frecuencia base lenta
    const wave1 = Math.sin(animValue.value * 2 * Math.PI + index * 0.4);
    
    // Onda 2: Frecuencia más rápida y caótica (usando cos y desfase distinto)
    const wave2 = Math.cos(animValue.value * 4.3 * Math.PI + index * 0.9);
    
    // Combinamos las dos ondas (-1 a 1), normalizamos a (0 a 1)
    const combinedWave = (wave1 + wave2) / 2;
    const multiplier = combinedWave * 0.5 + 0.5;

    // Calculamos la altura (Base 5px, oscilación de 21px)
    const height = 5 + multiplier * 21; 

    return { height };
  });

  return (
    <Animated.View
      style={[
        { width: 3, backgroundColor: '#22d3ee', borderRadius: 2, marginHorizontal: 1 },
        animatedStyle
      ]}
    />
  );
};

export const Waveform = ({ count = 39, isStatic = true }) => {
  const animValue = useSharedValue(0);

  useEffect(() => {
    if (!isStatic) {
      // Un único motor de animación constante y lineal
      animValue.value = withRepeat(
        withTiming(1, { // Un ciclo completo
          duration: 1800, // Velocidad de la interferencia
          easing: Easing.linear // Flujo constante
        }),
        -1, // Infinito
        false // Flujo continuo (el caos se genera matemáticamente)
      );
    } else {
      // Volvemos al estado inicial suavemente
      animValue.value = withTiming(0, { duration: 300 });
    }
  }, [isStatic]);

  return (
    <View className="flex-row items-center h-10 px-2 justify-center overflow-hidden">
      {[...Array(count)].map((_, i) => (
        <WaveBar key={i} index={i} animValue={animValue} isStatic={isStatic} />
      ))}
    </View>
  );
};