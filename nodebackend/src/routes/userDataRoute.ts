import express from 'express';
import { getLastLogin } from '../utils/useLoginsModule'; 
import logger from '../logger';

const router = express.Router();

router.get('/', async (req: express.Request, res: express.Response) => {
    const username = req.user?.username;
    if (!username) {
        return res.status(401).send('Unauthorized: User information not available');
    }

    try {
        const lastLogin = await getLastLogin(username);

        if (lastLogin) {
            logger.info(`Retrieved last login for user ${username} `, lastLogin);
            res.json({ lastLogin });
        } else {
            res.status(404).json({ message: 'No login information found for the user' });
        }
    } catch (error) {
        logger.error('Error: ', error);
        res.status(500).send('internalServerError');
    }
});

export default router;