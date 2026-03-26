import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native'
import React, { useRef, useState } from 'react'
import { authService } from 'services/authService';
import { useAuth } from 'context/AuthContext';
import { revisarConexion } from 'lib/utils';
import CustomAlert from 'components/customAlert';

// CORRECCIÓN: usable debe ir entre llaves { usable } para desestructurar las props
const LoginComponent = ({ usable = false }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const alertRef = useRef(null);

  const handleLogin = async () => {
    // Protección extra por si acaso
    if (!usable) return;

    const isOnline = await revisarConexion();

    if (!isOnline) {
      alertRef.current.show("Error de conexion", "No hemos detectado internet. Revisa tu red.");
      return;
    }

    try {
      //envia las credenciales al servidor
      const data = await authService.login(email, password);

      //Enviamos lo recibido al contexto de autenticacion
      await login(data);

    } catch (error) {
      console.error("LOGIN COMPONENT - login: ", error);
      alertRef.current.show("Error de Autenticación", error.message);
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
        // Opcional: También bloquear inputs si no es usable
        editable={usable}
        className={`bg-slate-900 text-white p-4 rounded-lg mb-4 border border-slate-800 ${!usable ? 'opacity-50' : ''}`}
      />

      <TextInput
        placeholder="Password"
        placeholderTextColor="#64748b"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={usable}
        className={`bg-slate-900 text-white p-4 rounded-lg mb-8 border border-slate-800 ${!usable ? 'opacity-50' : ''}`}
      />

      <TouchableOpacity
        onPress={() => handleLogin()}
        disabled={!usable}
        // CAMBIO AQUÍ: Clases dinámicas para fondo y opacidad
        className={`p-4 rounded-lg items-center mb-4 ${usable
            ? 'bg-[#00FFFF]'
            : 'bg-slate-700 opacity-60' // Fondo oscuro y semitransparente cuando no es usable
          }`}
      >
        <Text className={`font-bold text-lg ${usable
            ? 'text-slate-950' // Texto oscuro sobre fondo cian
            : 'text-slate-400' // Texto gris sobre fondo oscuro
          }`}>
          ENTRAR
        </Text>
      </TouchableOpacity>
    </View>
  )
}

export default LoginComponent