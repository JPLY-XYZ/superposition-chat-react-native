import QuickCrypto from 'react-native-quick-crypto';
import * as SecureStore from 'expo-secure-store';
import { Buffer } from 'buffer';

// 1. Genera el par de claves RSA y guarda la privada
export const generateAndStoreKeyPair = async () => {
    try {
        const keyPair = QuickCrypto.generateKeyPairSync('rsa', {
            modulusLength: 2048, // Longitud estándar para RSA
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        });

        await SecureStore.setItemAsync('private_key', keyPair.privateKey);

        return keyPair.publicKey;
    } catch (error) {
        console.error("Error generando claves RSA:", error);
        throw error;
    }
};

const formatPEM = (key) => {
    if (!key) return null;
    // Eliminar cabeceras, pies y CUALQUIER espacio/salto de línea
    const base64 = key
        .replace(/-----BEGIN PUBLIC KEY-----/g, '')
        .replace(/-----END PUBLIC KEY-----/g, '')
        .replace(/\s+/g, '');

    const rows = base64.match(/.{1,64}/g);
    return `-----BEGIN PUBLIC KEY-----\n${rows.join('\n')}\n-----END PUBLIC KEY-----`;
};

// 2. Recupera la clave privada
export const getPrivateKey = async () => {
    return await SecureStore.getItemAsync('private_key');
};

// 3. Cifra el mensaje usando la clave pública (del destinatario)
export const encryptMessage = (text, publicKeyPem) => {
    try {



        const bufferText = Buffer.from(text, 'utf8');
        const encrypted = QuickCrypto.publicEncrypt(formatPEM(publicKeyPem), bufferText);

        return encrypted.toString('base64');
    } catch (error) {
        console.error("ERROR AL CIFRAR", error)
    }

};

// 4. Descifra el mensaje usando tu clave privada
export const decryptMessage = async (encryptedText) => {

    try {
        const privateKeyPem = await SecureStore.getItemAsync('private_key')
        const bufferEncrypted = Buffer.from(encryptedText, 'base64');
        const decrypted = QuickCrypto.privateDecrypt(privateKeyPem, bufferEncrypted);

        return decrypted.toString('utf8');
    } catch (error) {
        console.error("ERROR AL DESCIFRAR", error)
        return "MENSAJE CIFRADO"
    }


};