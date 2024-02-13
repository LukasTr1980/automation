import express from 'express';
import jwt from 'jsonwebtoken';
import { connectToRedis } from '../clients/redisClient';
import logger from '../logger';
import crypto from 'crypto';
import { isSecureCookie, jwtTokenExpiry, isDomainCookie, isSubDomainCookie } from '../envSwitcher';
import { getJwtAccessTokenSecret } from '../configs';
import { initializeEncryptionKey, decrypt, encrypt } from '../utils/enyryptDecrypt';
import { roleCookieValidation, refreshTokenValidation, deviceIdValidation, usernameValidation } from '../utils/inputValidation';
 
interface StoredData {
    refreshToken: string;
    userRole?: string;
}

const router = express.Router();

router.post('/', async (req, res) => {
    const { username, deviceId } = req.body;

    const refreshTokenFromBody = req.cookies.refreshToken;
    const role = req.cookies.role;

    const roleValidationResult = roleCookieValidation(role);
    if (roleValidationResult.error) {
        logger.error(`role Cookie validation error: ${roleValidationResult.error.details[0].message}`);
        return res.status(400).json({ message: 'internalServerError' });
    }

    const refreshTokenValidationResult = refreshTokenValidation(refreshTokenFromBody);
    if (refreshTokenValidationResult.error) {
        logger.error(`refreshToken validation error: ${refreshTokenValidationResult.error.details[0].message}`);
        return res.status(400).json({ message: 'internalServerError' });
    }

    const deviceIdValidationResult = deviceIdValidation(deviceId);
    if (deviceIdValidationResult.error) {
        logger.error(`deviceId validation error: ${deviceIdValidationResult.error.details[0].message}`);
        return res.status(400).json({ message: 'internalServerError' });
    }

    const usernameValidationResult = usernameValidation(username);
    if (usernameValidationResult.error) {
        logger.error(`username validation error: ${usernameValidationResult.error.details[0].message}`);
        return res.status(400).json({ message: 'internalServerError' });
    }

    try {
        const redis = await connectToRedis();
        const storedDataJson = await redis.get(`refreshToken:${username}_${deviceId}`);

        await initializeEncryptionKey();
        const decryptedRoleCookie = decrypt(role);

        let storedData: StoredData = { refreshToken: '' };
        if (storedDataJson) {
            try {
                storedData = JSON.parse(storedDataJson);
            } catch (error) {
                logger.error('Failed to parse stored refresh token data');
                return res.status(500).json({ message: 'internalServerError', severity: 'error' })
            }
        }

        if (!storedDataJson || storedData.refreshToken !== refreshTokenFromBody) {
            logger.warn('Invalid refresh token');
            return res.status(401).json({ message: 'invalidOrExpiredToken', severity: 'warning' });
        }

        if (!storedDataJson || storedData.userRole !== decryptedRoleCookie) {
            logger.warn('Invalid user')
            return res.status(403).json({ message: 'forbiddenYouDontHavePermission', severity: 'warning' })
        }

        const jwtSecret = await getJwtAccessTokenSecret();
        const expiresIn = jwtTokenExpiry;

        const newAccessToken = jwt.sign({ username: username, role: storedData.userRole }, jwtSecret, { expiresIn });
        const newForwardAuthToken = jwt.sign({ username: username, role: storedData.userRole }, jwtSecret, {expiresIn});

        const newRefreshToken = crypto.randomBytes(40).toString('hex');
        const refreshTokenData: StoredData = { refreshToken: newRefreshToken, userRole: storedData.userRole }

        await redis.set(`refreshToken:${username}_${deviceId}`, JSON.stringify(refreshTokenData), 'EX', 30 * 24 * 60 * 60);

        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: isSecureCookie,
            domain: isSubDomainCookie,
            maxAge: 30 * 24 * 60 * 60 * 1000,
            sameSite: 'lax'
        });

        const encryptedRoleCookie = encrypt(storedData.userRole);

        res.cookie('role', encryptedRoleCookie, {
            httpOnly: true,
            secure: isSecureCookie,
            domain: isSubDomainCookie,
            maxAge: 30 * 24 * 60 * 60 * 1000,
            sameSite: 'lax'
        });

        res.cookie('forwardAuthToken', newForwardAuthToken, {
            httpOnly: true,
            secure: isSecureCookie,
            domain: isDomainCookie,
            maxAge: expiresIn * 1000,
            sameSite: 'lax'
        })

        res.status(200).json({  
            accessToken: newAccessToken
        });
    } catch (error) {
        const message = (error instanceof Error) ? error.message : 'unknownError';
        logger.error(`An error occurred: ${message}`);
        res.status(500).json({ message: 'internalServerError' });
    }
});

export default router;
