import User from '../models/User';
import jwt from 'jsonwebtoken';
import { sendEmail } from './sendEmail';
import CustomRequest from '../types/customRequest';
import { Response } from 'express';

export const sendOtpEmail = async (req: CustomRequest, res:Response) => {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).send('User not found');
  
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();
  
    await sendEmail(user.email, 'Your OTP for email verification', `<p>Your OTP is: <strong>${otp}</strong></p>`);
  
  };
  
