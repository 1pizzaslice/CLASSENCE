import { Request } from "express";

interface CustomRequest extends Request {
    user?: {
        _id: string;
        version?: number;
    };
}

export default CustomRequest;