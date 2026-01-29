import React, { useState, useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

const GlitchStatusIcon = () => {
  // Estados posibles del icono
  const states = [
    { name: 'check', color: '#64748b' },          // Sent
    { name: 'check-double', color: '#94a3b8' },   // Received
    { name: 'check-double', color: '#00FFFF' },   // Read (Cian)
  ];

  const [index, setIndex] = useState(0);
  const shakeAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  useEffect(() => {
    let timeoutId;

    const glitchLoop = () => {
      // 1. Cambiamos a un icono aleatorio de la lista
      const nextIndex = Math.floor(Math.random() * states.length);
      setIndex(nextIndex);

      // 2. Sacudida visual (Shake)
      const randomX = (Math.random() - 0.5) * 4;
      const randomY = (Math.random() - 0.5) * 2;
      
      Animated.sequence([
        Animated.timing(shakeAnim, {
          toValue: { x: randomX, y: randomY },
          duration: 30,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: { x: 0, y: 0 },
          duration: 30,
          useNativeDriver: true,
        })
      ]).start();

      // 3. Tiempo aleatorio para el siguiente salto (muy rápido para efecto glitch)
      // Entre 50ms y 150ms para que sea frenético
      const nextTick = Math.random() * 600 + 200;
      timeoutId = setTimeout(glitchLoop, nextTick);
    };

    glitchLoop();

    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <View style={{ width: 20, height: 20, justifyContent: 'center', alignItems: 'center' }}>
      
      {/* Capa de Aberración Magenta (Fantasma) */}
      <Animated.View style={{
        position: 'absolute',
        opacity: 0.4,
        transform: [
          { translateX: Animated.add(shakeAnim.x, -2) },
          { translateY: shakeAnim.y }
        ]
      }}>
        <FontAwesome5 name={states[index].name} size={14} color="#FF00FF" />
      </Animated.View>

      {/* Capa Principal (Cambiante) */}
      <Animated.View style={{
        transform: shakeAnim.getTranslateTransform(),
      }}>
        <FontAwesome5 
          name={states[index].name} 
          size={14} 
          color={states[index].color} 
        />
      </Animated.View>

    </View>
  );
};

export default React.memo(GlitchStatusIcon);