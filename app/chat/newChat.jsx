import { useState, useEffect } from 'react';
import { View, ScrollView, Text } from 'react-native';
import UserCard from 'components/chats/newChat/UserCard';
import { UserQueries } from 'lib/database/db';

const NewChat = () => {

  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    //obtiene todos los contactos del usuario de la base de datos local
    const fetchContacts = async () => {
        setLoading(true); 
        try {
            const data = await UserQueries.getContacts();
            console.log("DATA EN NEWCHAT - fetchContacts:", data);
            setContacts(data);
        } catch (error) {
            console.error("ERROR EN NEWCHAT - fetchContacts:", error);
        } finally {
            setLoading(false);
        }
    };
    fetchContacts();
  }, []);

  return (
    <View className="flex-1 bg-slate-950">
      
      {loading ? (
        // ============================================================
        // A. SKELETONS (Diseño exacto de UserCard)
        // ============================================================
        <View className="flex-1 mt-2"> 
            {[...Array(6)].map((_, index) => (
                <View 
                    key={index} 
                    className="flex-row items-center p-4 bg-slate-900 border-b border-slate-800 mx-2 mb-2 rounded-xl animate-pulse"
                >
                    {/* 1. Skeleton Avatar (Círculo) */}
                    <View className="w-12 h-12 rounded-full bg-slate-800" />
                    
                    {/* 2. Skeleton Info (Nombre) */}
                    <View className="flex-1 ml-4">
                        {/* Barra del nombre */}
                        <View className="h-5 w-32 bg-slate-800 rounded" />
                    </View>

                    {/* 3. Skeleton Icono (Botón derecho) */}
                    <View className="h-10 w-10 rounded-full bg-slate-800" />
                </View>
            ))}
        </View>
      ) : (
        // ============================================================
        // B. LISTA REAL
        // ============================================================
        <ScrollView className="flex-1 mt-2">
            {contacts.length > 0 ? (
                contacts.map((contact) => (
                  <UserCard key={contact.id} contact={contact} />
                ))
            ) : (
                // Estado Vacío
                <View className="flex-1 justify-center items-center mt-10 opacity-50">
                    <Text className="text-gray-500 text-sm">No hay contactos en la superposición</Text>
                </View>
            )}
        </ScrollView>
      )}
    </View>
  )
}

export default NewChat