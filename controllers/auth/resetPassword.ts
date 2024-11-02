import { Response, Request, NextFunction } from "express";
import {User} from "../../models";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { sendEmail } from "../../utility"; 
import { CustomError } from "../../types";

export const requestPasswordReset = async (req: Request, res: Response,next:NextFunction) => {
  try {
    const { email } = req.body;
  
    const user = await User.findOne({ email });
  
    if (!user) {
      next(new CustomError('User not found', 404));
      return;
    }

    if(!user.isVerified){
      next(new CustomError('Please verify your email to reset password!', 400));
      return;
    }

    const fiveMinutes = 5 * 60 * 1000;
    const now = Date.now();
    if (user.lastPasswordResetRequest && (now - user.lastPasswordResetRequest.getTime()) < fiveMinutes) {
      next(new CustomError('You can request a new password reset link only every 5 minutes', 429));
      return;
    }
  
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET as string, { expiresIn: '1h' });
  
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); 
    user.lastPasswordResetRequest = new Date(now);
    await user.save();
    const data =`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #f9fafb; display: flex;flex-direction: column ;">
        
        <img src="https://i.ibb.co/41hPJtW/logo.png" alt="" style="width: 150px; align-self: center;">
        <br>
        <br>
      <p style="color: #555; font-size: 16px; line-height: 1.6;">Hello ${user.name},</p>
      <br>
      <p style="color: #555; font-size: 16px; line-height: 1.6;">We received a request to reset your password. Click the button below to proceed:</p>
      
      <br>
      <div style="text-align: center; margin: 20px 0;">
        <a href="${resetUrl}" style="background-color: #066769; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-size: 16px; display: inline-block;">Reset Password</a>
      </div>
      <br>
      
      <p style="color: #555; font-size: 16px; line-height: 1.6;">If you didn't request this, please ignore this email. Your account will remain secure.</p>
      <br><br>
      <p style="color: #555; font-size: 16px; line-height: 1.6;">Best regards,<br>Classence Team</p>
      <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 30px 0;">
      <p style="font-size: 13px; color: #a1a1a1; text-align: center; line-height: 1.5;">If you're having trouble clicking the button, copy and paste the URL below into your web browser:</p>
      <p style="font-size: 13px; color: #4b8bf7; word-break: break-all; text-align: center;"><a href="${resetUrl}" style="color: #066769; text-decoration: none;">${resetUrl}</a></p>
    </div>
    `
    
    sendEmail(user.email, 'Password Reset Request', data);
  
    res.status(200).json({ 
      success: true, 
      message: 'Password reset link has been sent to your email! Please check your inbox, it should arrive within a few seconds.'
    });
  } catch (error) {
    next(new CustomError('Something went wrong!', 500));
  }
};

export const resetPassword = async (req: Request, res: Response,next:NextFunction) => {
  try {
    const { token } = req.params;
    const { password } = req.body;  
    //   console.log(typeof token);
    if (typeof token !== 'string') {
      next(new CustomError('Invalid token', 400));
      return;
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as jwt.JwtPayload;
    const userId = decoded.userId;

    const user = await User.findById(userId);
    if (!user || user.resetPasswordToken !== token) {
        next(new CustomError('Invalid token', 400));
        return;
    }

    if (!user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
        next(new CustomError('Invalid or expired token', 400));
        return;
      }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    user.resetPasswordToken = undefined; 
    user.resetPasswordExpires = undefined;
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ success: true, message: 'Password reset successfully' });    
  } catch (error) {
    console.log( error);
    next(new CustomError('Something went wrong!', 500));
  }
};
