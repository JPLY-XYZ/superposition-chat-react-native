import { View, Text, TextInput, TouchableOpacity } from 'react-native'
import React, { useRef, useState } from 'react'
import { authService } from 'services/authService';
import { useAuth } from 'context/AuthContext';
import { revisarConexion } from 'lib/utils';
import CustomAlert from 'components/customAlert';

const SingUpComponent = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const { login } = useAuth();
  const alertRef = useRef(null);



  const handleRegister = async () => {

    const isOnline = await revisarConexion();

    if (!isOnline) {
      alertRef.current.show("Error de Conexión", "No hemos detectado internet. Revisa tu red.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alertRef.current.show("Email Inválido", "Ese formato no parece correcto.");
      return;
    }

    if (password.length < 8) {
      alertRef.current.show("Contraseña Inválida", "La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    try {
      //Llamada a la api para crear un usuari
      await authService.register(email, password);
      try {
        //Llamada a la api para iniciar sesión
        const data = await authService.login(email, password);

        //Enviamos lo recibido al contexto de autenticacion
        await login(data);

      } catch (error) {
        console.error("ERROR EN EL LOGIN TRAS REGISTRO -> ", error);
        alertRef.current.show("Error de Autenticación", error.message);
      }

    } catch (error) {
      console.error("ERROR EN EL REGISTRO -> ", error);
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
        onPress={() => handleRegister()}
        className="bg-[#FF00FF] p-4 rounded-lg items-center mb-4"
      >
        <Text className="text-slate-950 font-bold text-lg">CREAR CUENTA</Text>
      </TouchableOpacity>
    </View>
  )
}

export default SingUpComponent