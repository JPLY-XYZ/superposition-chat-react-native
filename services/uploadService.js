// IMPORTANTE: Añadimos '/legacy' al final
import * as FileSystem from 'expo-file-system/legacy';
import { getSettings } from 'lib/auth/storage';

export const uploadFileToServer = async (uri, token) => {
    const { API_URL } = await getSettings();
    try {
        const response = await FileSystem.uploadAsync(
            `${API_URL}/upload`,
            uri,
            {
                httpMethod: 'POST',
                uploadType: FileSystem.FileSystemUploadType.MULTIPART,
                fieldName: 'file', // El nombre del campo que espera tu backend
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            }
        );

        if (response.status !== 200 && response.status !== 201) {
            console.error("Error del servidor:", response.body);
            return null;
        }

        const data = JSON.parse(response.body);
        return data.url;

    } catch (error) {
        console.error("Error subiendo archivo (FileSystem):", error);
        return null;
    }
};