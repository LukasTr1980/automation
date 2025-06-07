import * as vaultClient from '../clients/vaultClient';
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import logger from '../logger';

let SECRET_KEY: string; // Declare SECRET_KEY at a scope accessible to encrypt and decrypt functions
const IV_LENGTH = 16; // For AES, this is always 16

async function initializeEncryptionKey(): Promise<void> {
    try {
        await vaultClient.login();
        const secretPath = 'kv/data/automation/cookies';
        const encryptionData = await vaultClient.getSecret(secretPath);
        SECRET_KEY = encryptionData.data.encryption_key; // Directly use the UTF-8 string as the key
        if (SECRET_KEY.length !== 32) {
            logger.error('Encryption key must be 32 characters long.');
            throw new Error('Encryption key must be 32 characters long.');
        }
    } catch (error) {
        logger.error('Error initializing encryption key:', error);
        throw error; // Rethrow or handle as needed
    }
}

function encrypt(text: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv('aes-256-cbc', Buffer.from(SECRET_KEY, 'utf8'), iv);
    let encrypted = cipher.update(text, 'utf8');

    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text: string): string {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = createDecipheriv('aes-256-cbc', Buffer.from(SECRET_KEY, 'utf8'), iv);
    let decrypted = decipher.update(encryptedText);

    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString();
}

export { encrypt, decrypt, initializeEncryptionKey };
