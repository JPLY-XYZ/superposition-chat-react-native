import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native'
import React, { useRef, useState } from 'react'
import { authService } from 'services/authService';
import { useAuth } from 'context/AuthContext';
import { revisarConexion } from 'lib/utils';
import CustomAlert from 'components/customAlert';

const LoginComponent = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const alertRef = useRef(null);

const handleLogin = async () => {

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
        className="bg-slate-900 text-white p-4 rounded-lg mb-4 border border-slate-800"
      />

      <TextInput
        placeholder="Password"
        placeholderTextColor="#64748b"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        className="bg-slate-900 text-white p-4 rounded-lg mb-8 border border-slate-800"
      />

      <TouchableOpacity
        onPress={() => handleLogin()}
        className="bg-[#00FFFF] p-4 rounded-lg items-center mb-4"
      >
        <Text className="text-slate-950 font-bold text-lg">ENTRAR</Text>
      </TouchableOpacity>
    </View>
  )
}

export default LoginComponent