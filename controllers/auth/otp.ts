import { NextFunction, Response } from 'express';
import {User,Otp} from '../../models';
import {CustomRequest,CustomError} from '../../types';
import { sendEmail } from '../../utility';

const verifyOtp = async (req: CustomRequest, res: Response,next:NextFunction) => {
  try {
    const { email, otp } = req.body;

    const [storedOtp, user] = await Promise.all([
        Otp.findOne({ email, otp }),
        User.findOne({ email })
    ]);

    if (!storedOtp) {
        next(new CustomError('Invalid OTP!', 400));
        return;
    }

    if (!user) {
        next(new CustomError('User not found!', 404));
        return;
    }

    if(user.isVerified){
        next(new CustomError('Email already verified!', 400));
        return;
    }
    user.isVerified = true;
    await Promise.all([
        user.save(),
        Otp.deleteOne({ email, otp })
    ]);
    res.status(200).json({
        success: true,
        message: 'Email verified successfully!',
    });
  } catch (error) {
    next(new CustomError('Something went wrong!', 500));
  }
};

const resendOtp = async(req: CustomRequest, res: Response,next:NextFunction) => {
  try {
    const {email} = req.body;
    const user = await User.findOne({email});
    if (!user){
      next(new CustomError('User not found!', 404));
      return;
    }

    if(user.isVerified){
      next(new CustomError('Email already verified!', 400));
      return;
    }
    sendOtpEmail(req, res,next);
    res.status(200).json({
      success: true,
      message: 'OTP sent to your email!',
    });
  } catch (error) {
    next(new CustomError('Something went wrong!', 500));
  }
}

const sendOtpEmail = async (req: CustomRequest, res:Response,next:NextFunction) => {
  try {
    const { email } = req.body;
    const [user] = await Promise.all([
      User.findOne({ email }),
      Otp.deleteOne({ email })
    ]);
    if (!user){
      next(new CustomError('User not found!', 404));
      return;
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const otpData = new Otp({
      email: email,
      otp: otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    });
    await otpData.save();
    const data =
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: #333; text-align: center;">Email Verification Code</h2>
        <p>Hello ${user.name},</p>
        <p>Thank you for signing up! To complete the verification of your email address, please use the One-Time Password (OTP) below:</p>
        <div style="text-align: center; margin: 20px 0;">
          <span style="font-size: 24px; font-weight: bold; color: #007bff;">${otp}</span>
        </div>
        <p>This OTP is valid for the next 10 minutes. Please do not share it with anyone.</p>
        <p>If you did not request this verification, please disregard this email.</p>
        <p>Best regards,<br>Classence</p>
        <hr style="border: 0; border-top: 1px solid #ddd; margin: 30px 0;">
        <p style="font-size: 12px; color: #888; text-align: center;">If you have any issues, feel free to contact our support team.</p>
      </div>
      `;    

    sendEmail(user.email, 'Your OTP for email verification', data);
  } catch (error) {
    next(new CustomError('Something went wrong!', 500));
  }
};
    
export {verifyOtp,sendOtpEmail,resendOtp};