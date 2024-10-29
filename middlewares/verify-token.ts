import { Request, Response, NextFunction } from "express";
import {CustomRequest , CustomError } from "../types";

import jwt, { JwtPayload } from "jsonwebtoken";

 const verify = (req: CustomRequest, res: Response, next: NextFunction) => {
    const auth = req.header('Authorization');
    if (!auth){
        next(new CustomError(`Access denied`, 401));
        return
    }
    let token = auth.split(' ')[1];
    if (!token){
        next(new CustomError(`Access denied`, 401));
        return
    }
    try {
        const verify = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload & { _id: string };
        if (verify && '_id' in verify) {
            req.user = { _id: verify._id };
            next();
        } else {
            next(new CustomError(`Invalid token`, 400));
            return
        }
    } catch (err) {
        next(new CustomError(`Something went wrong`, 500));
            return
    }
}
export default verify;