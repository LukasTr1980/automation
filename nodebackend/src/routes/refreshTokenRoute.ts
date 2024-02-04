import express from 'express';
import jwt from 'jsonwebtoken';
import { connectToRedis } from '../clients/redisClient';
import logger from '../logger';
import crypto from 'crypto';
import { isSecureCookie } from '../envSwitcher';
import { getJwtAccessTokenSecret } from '../configs';

interface StoredData {
    refreshToken: string;
    userRole?: string;
}

const router = express.Router();

router.post('/', async (req, res) => {
    const { username } = req.body;

    const refreshTokenFromBody = req.cookies.refreshToken;
    const role = req.cookies.role;

    if (!username || !role || !refreshTokenFromBody) {
        logger.error('Username and refresh token are required');
        return res.status(400).json({ status: 400, message: 'notLoggedIn', severity: 'warning' });
    }

    try {
        const redis = await connectToRedis();
        const storedDataJson = await redis.get(`refreshToken:${username}`);

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

        if (!storedDataJson || storedData.userRole !== role) {
            logger.warn('Invalid user')
            return res.status(403).json({ message: 'forbiddenYouDontHavePermission', severity: 'warning' })
        }

        const jwtSecret = await getJwtAccessTokenSecret();
        const expiresIn = 60;

        const newAccessToken = jwt.sign({ username: username, role: storedData.userRole }, jwtSecret, { expiresIn });

        const newRefreshToken = crypto.randomBytes(40).toString('hex');
        const refreshTokenData: StoredData = { refreshToken: newRefreshToken, userRole: storedData.userRole }

        await redis.set(`refreshToken:${username}`, JSON.stringify(refreshTokenData), 'EX', 30 * 24 * 60 * 60);

        const expirationTimestamp = Math.floor(Date.now() / 1000) + expiresIn;

        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: isSecureCookie,
            maxAge: 30 * 24 * 60 * 60,
            sameSite: 'lax'
        });

        res.cookie('role', storedData.userRole, {
            httpOnly: true,
            secure: isSecureCookie,
            maxAge: 30 * 24 * 60 * 60,
            sameSite: 'lax'
        });

        res.json({ 
            status: 'success', 
            accessToken: newAccessToken,
            expiresAt: expirationTimestamp
        });
    } catch (error) {
        const message = (error instanceof Error) ? error.message : 'unknownError';
        logger.error(`An error occurred: ${message}`);
        res.status(500).json({ message: 'internalServerError' });
    }
});

export default router;
