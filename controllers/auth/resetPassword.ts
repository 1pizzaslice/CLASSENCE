import { Response, Request, NextFunction } from "express";
import {User} from "../../models";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { sendEmail } from "../../utility"; 
import { CustomError } from "../../types";

export const requestPasswordReset = async (req: Request, res: Response,next:NextFunction) => {
  try {
    let { email } = req.body;
    email = email.trim();
    if (!email) {
      next(new CustomError('Email is required', 400));
      return;
    }
    const user = await User.findOne({ email });
  
    if (!user) {
      next(new CustomError('User not found', 404));
      return;
    }

    if(!user.isVerified){
      next(new CustomError('Please verify your email to reset password!', 400));
      return;
    }

    const fiveMinutes = 0.5 * 60 * 1000;
    const now = Date.now();
    if (user.lastPasswordResetRequest && (now - user.lastPasswordResetRequest.getTime()) < fiveMinutes) {
      next(new CustomError('You can request a new password reset link only every 30 sec', 429));
      return;
    }
  
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET as string, { expiresIn: '1h' });
  
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); 
    user.lastPasswordResetRequest = new Date(now);
    await user.save();
    const data = `
    <body style="margin: 0; padding: 0; width: 100%; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <div style="max-width: 600px; width: 100%; margin: 20px auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff; box-sizing: border-box;">
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="https://i.ibb.co/41hPJtW/logo.png" alt="Logo" style="width: 120px; max-width: 100%;">
        </div>
        <p style="color: #333333; font-size: 18px; line-height: 1.5; text-align: center; margin: 0 20px;">
          Hello ${user.name},
        </p>
        <p style="color: #555555; font-size: 16px; line-height: 1.6; text-align: center; margin: 20px 20px;">
          We received a request to reset your password. Click the button below to proceed:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #066769; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-size: 16px;">
            Reset Password
          </a>
        </div>
        <p style="color: #555555; font-size: 16px; line-height: 1.6; text-align: center; margin: 20px 20px;">
          If you didn't request this, please ignore this email. Your account will remain secure.
        </p>
        <p style="color: #555555; font-size: 16px; line-height: 1.6; text-align: center; margin: 20px 20px;">
          Best regards,<br>
          Classence Team
        </p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
        <p style="font-size: 13px; color: #a1a1a1; text-align: center; margin: 20px;">
          If you're having trouble clicking the button, copy and paste the URL below into your web browser:
        </p>
        <p style="font-size: 13px; color: #066769; word-break: break-all; text-align: center; margin: 0;">
          <a href="${resetUrl}" style="color: #066769; text-decoration: none;">${resetUrl}</a>
        </p>
      </div>
    </body>
  `;

    
    sendEmail(user.email, 'Password Reset Request', data)
      .catch((error)=>{console.log("Error sending email: ", error);});
  
    res.status(200).json({ 
      success: true, 
      message: 'Password reset link has been sent to your email! Please check your inbox, it should arrive within a few seconds.'
    });
  } catch (error) {
    const err = error as Error;
    next(new CustomError('Something went wrong',500,`${err.message}`));
  }
};

export const resetPassword = async (req: Request, res: Response,next:NextFunction) => {
  try {
    const { token } = req.params;
    let { password } = req.body;  
    password = password.trim();
    if (!password) {
      next(new CustomError('Password is required', 400));
      return;
    }
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
    user.version += 1;
    await user.save();

    res.status(200).json({ success: true, message: 'Password reset successfully' });    
  } catch (error) {
    const err = error as Error;
    next(new CustomError('Something went wrong',500,`${err.message}`));
  }
};
