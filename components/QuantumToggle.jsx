import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Easing } from 'react-native';

const QuantumToggle = ({ value, onChange, labelLeft, labelRight, activeColor = '#00FFFF' }) => {
    const moveAnim = useRef(new Animated.Value(value ? 1 : 0)).current;

    useEffect(() => {
        Animated.timing(moveAnim, {
            toValue: value ? 1 : 0,
            duration: 300,
            easing: Easing.out(Easing.back(1.5)),
            useNativeDriver: false,
        }).start();
    }, [value]);

    const left = moveAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['2%', '51%'],
    });

    return (
        <View className="bg-[#0D1526] border border-slate-800 p-1 rounded-xl flex-row relative h-10 items-center w-32">
            <Animated.View
                style={{
                    position: 'absolute',
                    left,
                    backgroundColor: activeColor,
                    width: '47%',
                    height: '85%',
                    borderRadius: 8,
                    shadowColor: activeColor,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.5,
                    shadowRadius: 5,
                }}
            />
            <TouchableOpacity onPress={() => onChange(false)} className="flex-1 items-center z-10">
                <Text className={`text-[10px] font-bold ${!value ? 'text-[#0A0E1A]' : 'text-slate-500'}`}>{labelLeft}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onChange(true)} className="flex-1 items-center z-10">
                <Text className={`text-[10px] font-bold ${value ? 'text-[#0A0E1A]' : 'text-slate-500'}`}>{labelRight}</Text>
            </TouchableOpacity>
        </View>
    );
};

export default QuantumToggle;