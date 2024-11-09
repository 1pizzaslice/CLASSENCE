import { Request } from "express";

interface CustomRequest extends Request {
    user?: {
        _id: string;
    };
    // files?: Express.Multer.File[];
}

export default CustomRequest;