import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

export const vaultRoleId = process.env.VAULT_ROLE_ID!;
export const vaultSecretId = process.env.VAULT_SECRET_ID!;