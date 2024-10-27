import { Request, Response, NextFunction } from "express";
import CustomRequest from "../types/customRequest";

import jwt, { JwtPayload } from "jsonwebtoken";

export const verify = (req: CustomRequest, res: Response, next: NextFunction) => {
    const auth = req.header('Authorization');
    if (!auth)
        return res.status(401).send('Access denied!!!')
    let token = auth.split(' ')[1];
    if (!token)
        return res.status(401).send('Access denied!!!')
    try {
        const verify = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload & { _id: string };
        if (verify && '_id' in verify) {
            req.user = { _id: verify._id };
            next();
        } else {
            return res.status(400).send('Invalid token!!!');
        }
    } catch (err) {
        return res.status(400).send('Invalid token!!!')
    }
}