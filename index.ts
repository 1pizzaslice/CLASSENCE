import dotenv from "dotenv"; 
dotenv.config();
import {authRoute} from './routes/';
import  connectDB  from './db/connect';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import {logRequest ,errorHandler} from './middlewares';
import {CustomError} from './types';
import rateLimit from 'express-rate-limit';

const app = express();
const PORT : number = Number(process.env.PORT) || 5000;

app.set('trust proxy', 1);   // to resolve nginx proxy issue

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min 
    max: 100,                 // max 100 req per ip
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true, 
    legacyHeaders: false, 
});

app.use(limiter);

app.use(logRequest);
app.use(cors());
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));
app.use('/api/auth',authRoute);

app.use('*', (req: Request, res: Response,next:NextFunction) => {
    const error = new CustomError('Resource not found!!!!', 404);
    next(error);
});

app.use(errorHandler);

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is listening on PORT ${PORT}`);
    });
});