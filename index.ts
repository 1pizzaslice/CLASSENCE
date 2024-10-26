import dotenv from "dotenv"; 
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import {logRequest ,errorHandler} from './middlewares';
import {CustomError} from './types';


dotenv.config();

const app = express();
const PORT : number = Number(process.env.PORT) || 5000;


app.use(cors());
app.use(logRequest);

app.use('*', (req: Request, res: Response,next:NextFunction) => {
    const error = new CustomError('Resource not found!', 404);
    next(error);
});

app.use(errorHandler);

app.listen(PORT,()=>{
    console.log(`Server is listening on PORT ${PORT}`);
})