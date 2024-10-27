import { Request, Response } from 'express';
import User from '../models/User';
import CustomRequest from '../types/customRequest';

export const verifyOtp = async (req:CustomRequest, res:Response) => {
    const { email, otp } = req.body;
    const user = await User.findOne({ email, otp, otpExpires: { $gt: new Date() } });
  
    if (!user) {
        res.status(400).json({
            success: false,
            message: 'Invalid OTP or OTP expired',
        })
        return;
    }
  
    user.isVerified = true;
    user.otp = undefined; 
    user.otpExpires = undefined;
    await user.save();
  
    res.status(200).json({
        success: true,
        message: 'Email verified successfully!',
    });
  };
  