import express from 'express';
import { loginValidation } from '../utils/inputValidation';
import { connectToRedis } from '../clients/redisClient';
import crypto from 'crypto';
import * as vaultClient from '../clients/vaultClient'; // Import your Vault client
import logger from '../logger';
import { updateLastLogin } from '../utils/useLoginsModule';
import jwt from 'jsonwebtoken';
import { isSecureCookie, jwtTokenExpiry } from '../envSwitcher';
import { getJwtAccessTokenSecret } from '../configs';
import { initializeEncryptionKey, encrypt } from '../utils/enyryptDecrypt';
import generateUniqueId from '../utils/generateUniqueId';

const router = express.Router();

router.post('/', async (req: express.Request, res: express.Response) => {
    const clientIp: string | undefined = req.ip;

    const { error } = loginValidation(req.body);
    if (error) {
        logger.error(`Login validation error from IP ${clientIp}: ${error.details[0].message}`);
        return res.status(400).json({ message: error.details[0].message });
    }

    const { username, password } = req.body;

    try {
        await vaultClient.login();

        const secretPath: string = `kv/data/automation/login/${username}`;
        const userData = await vaultClient.getSecret(secretPath);

        if (!userData) {
            logger.warn(`Login failed for username: ${username} from IP ${clientIp} - User not found in Vault`);
            return res.status(401).json({ message: 'incorrectUserOrPass' });
        }

        const storedPassword: string = userData.data.password;
        const userRole: string = userData.data.role;

        if (password !== storedPassword) {
            logger.warn(`Login failed for username: ${username} from IP ${clientIp} - Incorrect password`);
            return res.status(401).json({ message: 'incorrectUserOrPass' });
        }

        const deviceId = generateUniqueId();

        const jwtSecret = await getJwtAccessTokenSecret();
        const expiresIn = jwtTokenExpiry;

        const accessToken = jwt.sign({ username, role: userRole }, jwtSecret, { expiresIn });

        const refreshToken = crypto.randomBytes(40).toString('hex');

        const redis = await connectToRedis();
        const refreshTokenData = JSON.stringify({ refreshToken, userRole });
        await redis.set(`refreshToken:${username}_${deviceId}`, refreshTokenData, 'EX', 30 * 24 * 60 * 60);

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: isSecureCookie,
            maxAge: 30 * 24 * 60 * 60 * 1000,
            sameSite: 'lax'

        })

        await initializeEncryptionKey();
        const encryptedRoleCookie = encrypt(userRole);

        res.cookie('role', encryptedRoleCookie, {
            httpOnly: true,
            secure: isSecureCookie,
            maxAge: 30 * 24 * 60 * 60 * 1000,
            sameSite: 'lax'
        });

        await updateLastLogin(username);
        logger.info(`User ${username} logged in successfully from IP ${clientIp}`);

        res.status(200).json({ accessToken, deviceId, message: 'loggedIn' });
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error during user login for username: ${username} from IP ${clientIp} - ${error.message}`);
            res.status(500).json({ message: 'internalServerError' });
        } else {
            logger.error(`An unexpected error occurred during user login for username: ${username} from IP ${clientIp}`);
            res.status(500).json({ message: 'internalServerError' });
        }
    }
});

export default router;
