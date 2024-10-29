import { NextFunction, Response } from 'express';
import {User,Otp} from '../models/';
import {CustomRequest,CustomError} from '../types/';

const verifyOtp = async (req: CustomRequest, res: Response,next:NextFunction) => {
  try {
    const { email, otp } = req.body;

    const storedOtp = await Otp.findOne({ email, otp });

    if (!storedOtp) {
        next(new CustomError('Invalid OTP!', 400));
        return;
    }

    const user = await User.findOne({ email });
    if (!user) {
        next(new CustomError('User not found!', 404));
        return;
    }

    user.isVerified = true;
    await user.save();
    await Otp.deleteOne({ email, otp });
    res.status(200).json({
        success: true,
        message: 'Email verified successfully!',
    });
  } catch (error) {
    next(new CustomError('Something went wrong!', 500));
  }
};

export default verifyOtp;