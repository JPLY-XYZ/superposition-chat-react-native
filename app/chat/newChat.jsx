import { useState, useEffect } from 'react';
import { View, ScrollView, Text, TextInput, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import UserCard from 'components/chats/newChat/UserCard';
import { UserQueries } from 'lib/database/db';
import { Ionicons } from '@expo/vector-icons';
import { usersService } from 'services/usersService';
import { useAuth } from 'context/AuthContext';

const NewChat = () => {
  const { token } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [isVerifying, setIsVerifying] = useState(false);
  const [networkUser, setNetworkUser] = useState(null);

  // Detecta si es un código completo: 0000-AAAA-A (11 caracteres)
  const isNetworkId = searchQuery.length === 11 && /[0-9]/.test(searchQuery[0]);

  useEffect(() => { fetchContacts(); }, []);

  // Petición automática al servidor al detectar formato de ID
  useEffect(() => {
    if (isNetworkId) {
      handleAutoVerify();
    } else {
      setNetworkUser(null);
    }
  }, [searchQuery]);

  const fetchContacts = async () => {
    const data = await UserQueries.getContacts();
    setContacts(data);
    setFilteredContacts(data);
  };

  const handleSearch = (text) => {
    let formatted = text.toUpperCase();

    // Auto-formateo 1111-AAAA-A si empieza por número
    if (/[0-9]/.test(text[0])) {
      const cleaned = text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      formatted = '';
      for (let i = 0; i < cleaned.length; i++) {
        if (i === 4 || i === 8) formatted += '-';
        formatted += cleaned[i];
        if (formatted.length >= 11) break;
      }
    }

    setSearchQuery(formatted);

    const filtered = contacts.filter(c =>
      c.displayName.toLowerCase().includes(text.toLowerCase()) || c.id.includes(formatted)
    );
    setFilteredContacts(filtered);
  };

  const handleAutoVerify = async () => {
    setNetworkUser(null);
    setIsVerifying(true);
    try {
      const user = await usersService.getUserFromServer(token, { code: searchQuery });

      // Si el servidor responde con el mensaje de no encontrado, aseguramos null
      if (user?.message === "Usuario no encontrado" || !user?.id) {
        setNetworkUser(null);
      } else {
        setNetworkUser(user);
      }
    } catch (e) {
      setNetworkUser(null);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAddNetworkUser = async () => {
    if (!networkUser) return;
    try {
      await UserQueries.upsertUser({
        id: networkUser.id,
        displayName: networkUser.displayName,
        imageUrl: networkUser.image_url || networkUser.imageUrl,
        isMe: 0,
        code: networkUser.code,
        publicKey: networkUser.public_key || networkUser.publicKey,
      });
      setSearchQuery('');
      fetchContacts();
    } catch (e) { console.error(e); }
  };

  return (
    <View className="flex-1 bg-slate-950">
      {/* BUSCADOR */}
      <View className="px-4 pt-4 pb-4 bg-slate-950">
        <View className="flex-row items-center bg-slate-900 border border-slate-800 rounded-2xl px-4 py-1">
          <Ionicons name="search" size={18} color="#475569" />
          <TextInput
            value={searchQuery}
            onChangeText={handleSearch}
            placeholder="Nombre o 0000-AAAA-A"
            placeholderTextColor="#475569"
            className="flex-1 ml-2 text-white h-11 font-medium"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={18} color="#475569" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView className="flex-1 px-2">
        {/* RESULTADO DE RED */}
        {isNetworkId && (
          <View className="mb-6 mt-2">
            <Text className="text-cyan-500 text-[10px] font-black uppercase tracking-[3px] ml-2 mb-3">
              Firma detectada en red
            </Text>

            <TouchableOpacity
              onPress={handleAddNetworkUser}
              disabled={isVerifying || !networkUser}
              activeOpacity={networkUser ? 0.8 : 1}
              className={`flex-row items-center p-4 bg-slate-900 border ${networkUser ? 'border-cyan-500/50 ' : 'border-slate-800'} rounded-2xl`}
            >
              {/* IZQUIERDA: DINÁMICO */}
              {isVerifying ? (
                <View className="w-14 h-14 rounded-full bg-slate-800 items-center justify-center">
                  <ActivityIndicator size="small" color="#22d3ee" />
                </View>
              ) : networkUser ? (
                <Image
                  source={{ uri: networkUser.imageUrl || networkUser.image_url || `https://api.dicebear.com/9.x/bottts/png?seed=${networkUser.id}` }}
                  className="w-14 h-14 rounded-full border-2 border-cyan-400"
                />
              ) : (
                <View className="w-14 h-14 rounded-full bg-slate-800 items-center justify-center border border-slate-700">
                  <Ionicons name="planet-outline" size={28} color="#475569" />
                </View>
              )}

              {/* CENTRO: TEXTO */}
              <View className="flex-1 ml-4">
                <Text className="text-white font-bold text-lg">
                  {isVerifying ? "Sincronizando..." : networkUser ? networkUser.displayName : "Nodo no identificado"}
                </Text>
                <Text className={`text-xs ${networkUser ? 'text-cyan-400/70' : 'text-slate-500'}`}>
                  {networkUser ? `Firma activa: ${networkUser.code}` : "Sin rastro en la red externa"}
                </Text>
              </View>

              {/* DERECHA: BOTÓN SOLO SI EXISTE */}
              {networkUser && !isVerifying && (
                <View className="bg-cyan-500 p-2.5 rounded-xl">
                  <Ionicons name="person-add" size={20} color="white" />
                </View>
              )}
            </TouchableOpacity>

            <View className="h-[1px] bg-slate-800 w-full mt-6 mb-2 opacity-50" />
          </View>
        )}

        {/* LISTADO LOCAL */}
        <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest ml-2 mb-3">
          {searchQuery ? 'Resultados locales' : 'Contactos de confianza'}
        </Text>

        {filteredContacts.length > 0 ? (
          filteredContacts.map((contact) => (
            <UserCard key={contact.id} contact={contact} />
          ))
        ) : !isNetworkId && (
          <View className="py-10 items-center opacity-40">
            <Ionicons name="search-outline" size={40} color="#475569" />
            <Text className="text-slate-500 text-xs mt-2 italic">Sin coincidencias locales</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default NewChat;