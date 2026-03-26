import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native'
import React, { useRef, useState } from 'react'
import { authService } from 'services/authService';
import { useAuth } from 'context/AuthContext';
import { revisarConexion } from 'lib/utils';
import CustomAlert from 'components/customAlert';

// CORRECCIÓN: Recibimos usable como prop
const SingUpComponent = ({ usable = false }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false); // Feedback de carga

  const { login } = useAuth();
  const alertRef = useRef(null);

  const handleRegister = async () => {
    if (!usable) return;

    setLoading(true);
    const isOnline = await revisarConexion();

    if (!isOnline) {
      alertRef.current.show("Error de Conexión", "No hemos detectado internet. Revisa tu red.");
      setLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alertRef.current.show("Email Inválido", "Ese formato no parece correcto.");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      alertRef.current.show("Contraseña Inválida", "La contraseña debe tener al menos 8 caracteres.");
      setLoading(false);
      return;
    }

    try {
      await authService.register(email, password);
      try {
        const data = await authService.login(email, password);
        await login(data);
      } catch (error) {
        console.error("ERROR EN EL LOGIN TRAS REGISTRO -> ", error);
        alertRef.current.show("Error de Autenticación", error.message);
      }
    } catch (error) {
      console.error("ERROR EN EL REGISTRO -> ", error);
      alertRef.current.show("Error de Autenticación", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <CustomAlert ref={alertRef} />

      <TextInput
        placeholder="Email"
        placeholderTextColor="#64748b"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        editable={usable && !loading}
        className={`bg-slate-900 text-white p-4 rounded-lg mb-4 border border-slate-800 ${!usable ? 'opacity-50' : ''}`}
      />

      <TextInput
        placeholder="Password"
        placeholderTextColor="#64748b"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={usable && !loading}
        className={`bg-slate-900 text-white p-4 rounded-lg mb-8 border border-slate-800 ${!usable ? 'opacity-50' : ''}`}
      />

      <TouchableOpacity
        onPress={() => handleRegister()}
        disabled={!usable || loading}
        // CAMBIO: Fondo magenta si es usable, gris oscuro si no.
        className={`p-4 rounded-lg items-center mb-4 ${usable ? 'bg-[#FF00FF]' : 'bg-slate-800 opacity-60'
          }`}
      >
        {loading ? (
          <ActivityIndicator color="#020617" />
        ) : (
          <Text className={`font-bold text-lg ${usable ? 'text-slate-950' : 'text-slate-500'
            }`}>
            CREAR CUENTA
          </Text>
        )}
      </TouchableOpacity>
    </View>
  )
}

export default SingUpComponent