import express from 'express';
import { getUserData } from '../utils/useLoginsModule'; 
import logger from '../logger';

const router = express.Router();

router.get('/', async (req: express.Request, res: express.Response) => {
    const username = req.user?.username;
    if (!username) {
        res.status(401).send('Unauthorized: User information not available');
        return;
    }

    try {
        const userData = await getUserData(username);

        if (userData) {
            res.json({ userData });
        } else {
            res.status(404).json({ message: 'No login information found for the user' });
        }
    } catch (error) {
        logger.error('Error: ', error);
        res.status(500).send('internalServerError');
    }
});

export default router;