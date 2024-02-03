import { Request, Response, NextFunction } from 'express';

const requiredRole = (requiredRole: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (req.user && req.user.role === requiredRole) {
            next();
        } else {
            res.status(403).json({ message: 'forbiddenYouDontHavePermission', severity: 'warning' })
        }
    };
};

export default requiredRole;