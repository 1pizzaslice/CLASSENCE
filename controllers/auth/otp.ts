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
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #f9fafb; display: flex;flex-direction: column ;">
        <img src="https://i.ibb.co/41hPJtW/logo.png" alt="" style="width: 150px; align-self: center;">
        <br>
        <br>
        <p style="color: #555; font-size: 16px; line-height: 1.6;">Hello ${user.name},</p>
        <br>
        <p style="color: #555; font-size: 16px; line-height: 1.6;">Thank you for signing up for Classence! To verify your email address, please enter the One-Time Password (OTP) below:</p>
        <br>
        <div style="text-align: center; margin: 20px 0;">
          <span style="font-size: 28px; font-weight: bold; color: #066769;">${otp}</span>
        </div>
        <br>
        <p style="color: #555; font-size: 16px; line-height: 1.6;">This OTP is valid for the next 10 minutes. Please keep it secure and do not share it with anyone.</p>
        <br>
        <p style="color: #555; font-size: 16px; line-height: 1.6;">If you did not request this verification, please disregard this email.</p>
        <br>
        <br>
        <p style="color: #555; font-size: 16px; line-height: 1.6;">Best regards,<br>Classence Team</p>
        <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 30px 0;">
        <p style="font-size: 13px; color: #a1a1a1; text-align: center; line-height: 1.5;">If you encounter any issues, please contact our support team at <a href="mailto:classence.help@gmail.com" style="color: #066769; text-decoration: none;">classence.help@gmail.com</a>.</p>
      </div>
      `;    

    sendEmail(user.email, 'Your OTP for email verification', data);
  } catch (error) {
    next(new CustomError('Something went wrong!', 500));
  }
};
    
export {verifyOtp,sendOtpEmail,resendOtp};