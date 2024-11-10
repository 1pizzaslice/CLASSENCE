import { Request } from "express";

interface CustomRequest extends Request {
    user?: {
        _id: string;
    };
}

export default CustomRequest;