import express from 'express';
import { connectToRedis } from '../clients/redisClient';
import namespaces from '../namespace';

const router = express.Router();
const markiseStatusNamespace: string = namespaces.markiseStatus;

router.get('/currentMarkiseStatus', async (req: express.Request, res: express.Response) => {
    const client = await connectToRedis();

    const keys: string[] = await client.keys(`${markiseStatusNamespace}:markise:*`);

    const markiseStatus: Record<string, string> = {};
    for (const key of keys) {
        const subKey: string = key.split(':').slice(2).join(':');
        const value: string | null = await client.get(key);
        markiseStatus[subKey] = value ?? '';
    }
    res.json(markiseStatus);
});

export default router;
