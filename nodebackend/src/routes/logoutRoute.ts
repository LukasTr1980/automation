import express from "express";
import { isSecureCookie, isDomainCookie, isSubDomainCookie } from "../envSwitcher";

const router = express.Router();

router.post('/', (req: express.Request, res: express.Response) => {

    res.cookie('refreshToken', '', {
        httpOnly: true,
        maxAge: 0,
        domain: isSubDomainCookie,
        secure: isSecureCookie,
        sameSite: 'lax'
    });

    res.cookie('role', '', {
        httpOnly: true,
        maxAge: 0,
        domain: isSubDomainCookie,
        secure: isSecureCookie,
        sameSite: 'lax'
    });

    res.cookie('forwardAuthToken', '', {
        httpOnly: true,
        secure: isSecureCookie,
        domain: isDomainCookie,
        maxAge: 0,
        sameSite: 'lax'
    })

    res.status(200).send('loggedOut');
});

export default router;
