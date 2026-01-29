import React, { useEffect, useRef } from 'react';
import { View, Animated, Text, Easing } from 'react-native';

const AnimatedText = Animated.createAnimatedComponent(Text);

const GlitchText = ({ children, isError = true }) => {
  const shakeAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const splitAnim = useRef(new Animated.Value(2)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  // Colores según tu paleta de "Física Cuántica"
  const colorPrincipal = isError ? '#FF00FF' : '#00FFFF'; // Magenta vs Cian
  const colorSecundario = isError ? '#00FFFF' : '#FF00FF';

  const runGlitch = () => {
    const randomX = (Math.random() - 0.5) * 8;
    const randomY = (Math.random() - 0.5) * 3;
    const randomSplit = Math.random() * 5 + 2;

    Animated.sequence([
      Animated.parallel([
        Animated.timing(shakeAnim, { toValue: { x: randomX, y: randomY }, duration: 40, useNativeDriver: true }),
        Animated.timing(splitAnim, { toValue: randomSplit, duration: 40, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0.5, duration: 20, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(shakeAnim, { toValue: { x: 0, y: 0 }, duration: 40, useNativeDriver: true }),
        Animated.timing(splitAnim, { toValue: 2, duration: 40, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 20, useNativeDriver: true }),
      ]),
      Animated.delay(Math.random() * 2000 + 100),
    ]).start(() => runGlitch());
  };

  useEffect(() => {
    runGlitch();
  }, []);

  // Estilo base para los textos para no repetir código
  const textBase = {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 2,
  };

  return (
    <View style={{ height: 40, justifyContent: 'center', alignItems: 'center' }}>
      
      {/* Capa de Color 1 (Sombra Magenta/Cian) */}
      <AnimatedText 
        style={[textBase, {
          color: colorSecundario,
          position: 'absolute',
          opacity: 0.6,
          transform: [
            { translateX: Animated.add(shakeAnim.x, Animated.multiply(splitAnim, -1)) },
            { translateY: shakeAnim.y }
          ]
        }]}
      >
        {children}
      </AnimatedText>
      
      {/* Capa de Color 2 (Sombra Cian/Magenta) */}
      <AnimatedText 
        style={[textBase, {
          color: colorPrincipal,
          position: 'absolute',
          opacity: 0.6,
          transform: [
            { translateX: Animated.add(shakeAnim.x, splitAnim) },
            { translateY: shakeAnim.y }
          ]
        }]}
      >
        {children}
      </AnimatedText>

      {/* Capa Blanca Principal */}
      <AnimatedText 
        style={[textBase, {
          color: 'white',
          opacity: opacityAnim,
          transform: [{ translateX: shakeAnim.x }, { translateY: shakeAnim.y }]
        }]}
      >
        {children}
      </AnimatedText>

    </View>
  );
};

export default GlitchText;