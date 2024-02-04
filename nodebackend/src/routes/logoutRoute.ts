import express from "express";
import { isSecureCookie } from "../envSwitcher";

const router = express.Router();

router.post('/', (req: express.Request, res: express.Response) => {
    res.cookie('refreshToken', '', {
        httpOnly: true,
        expires: new Date(0),
        secure: isSecureCookie,
        sameSite: 'lax'
    });

    res.cookie('role', '', {
        httpOnly: true,
        expires: new Date(0),
        secure: isSecureCookie,
        sameSite: 'lax'
    });

    res.status(200).send('loggedOut');
});

export default router;
