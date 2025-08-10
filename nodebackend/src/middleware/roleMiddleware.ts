import { Request, Response, NextFunction } from 'express';
import logger from '../logger.js';

const requiredRole = (requiredRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (req.user && requiredRoles.includes(req.user.role)) {
            next();
        } else {
            logger.warn('Role middleware verification, forbidden you dont have permission');
            res.status(403).json({ message: 'forbiddenYouDontHavePermission', severity: 'warning' });
        }
    };
};

export default requiredRole;