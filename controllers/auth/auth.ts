import { Response, Request, NextFunction } from "express";
import {CustomRequest , CustomError} from "../../types";
import {User} from "../../models";
import bcrypt from 'bcrypt';
import { sendOtpEmail } from "../index";
import jwt from "jsonwebtoken";

type RequestBody = {
    name: string;
    email: string;
    password: string
}
export const registerUser = async (req: Request, res: Response,next:NextFunction) => {
    const { name, email, password }: RequestBody = req.body;
    if (!name || !email || !password) {
        next(new CustomError('Name, email and password is required', 400));
        return;
    }
    const lowerEmail = email.toLowerCase();
    const emailExist = await User.findOne({ email:lowerEmail })
    if (emailExist){
        if(emailExist.isVerified){
            next(new CustomError('Email already exists !!', 400));
            return;
        }
    await User.deleteOne({ email:lowerEmail });
    }

    // hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // store user in db
    const user = new User({
        name: name,
        email: lowerEmail,
        password: hashedPassword
    });
    try {
        await user.save();
        sendOtpEmail(req, res,next);
        res.status(201).send({
            success: true,
            message: 'OTP sent to your email',
            user: {
                id: user._id, 
            },
        });
    } catch (error) {
        const err = error as Error;
        next(new CustomError('Something went wrong',500,`${err.message}`));
    }
}

export const loginUser = async (req: CustomRequest, res: Response , next: NextFunction) => {
    // create & assign a JWT
    try {
        const { email , password } = req.body ;
        if (!email || !password) {
            next(new CustomError('Email and password is required', 400));
            return;
        }
        const lowerEmail = email.toLowerCase();
        const user = await User.findOne({ email:lowerEmail})
        if (!user) {
            next(new CustomError('User not found', 400));
            return;
        }
        if(!user.isVerified){
            next(new CustomError('Please verify your email to login!', 400));
            return;
        }
        const validPass = await bcrypt.compare(password , user.password)
        if (validPass) {
            req.user = { _id: user._id };   
        }
        else{
            next(new CustomError('Incorrect Password', 400));
            return;
        }
        
        const token = jwt.sign({ _id: req.user?._id,version:user.version }, process.env.JWT_SECRET as string , {
            expiresIn: '24h'
        });
        const refreshToken = jwt.sign({ _id: req.user?._id,version:user.version }, process.env.JWT_SECRET as string , {
            expiresIn: '7d'
        });
    
        res.header('Authorization', `Bearer ${token}`).send({
            success: true,
            message: 'Logged in successfully!',
            token: token,
            refreshToken: refreshToken,
        });
    } catch (error) {
        const err = error as Error;
        next(new CustomError('Something went wrong',500,`${err.message}`));
    }

}