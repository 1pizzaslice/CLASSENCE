import { Response, Request } from "express";
import User from "../models/User";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { sendEmail } from "../utility/sendEmail"; 

export const requestPasswordReset = async (req: Request, res: Response) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    res.status(400).json({ success: false, message: 'User not found' });
    return;
  }

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET as string, { expiresIn: '1h' });

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  user.resetPasswordToken = token;
  user.resetPasswordExpires = new Date(Date.now() + 3600000); 
  await user.save();
  await sendEmail(user.email, 'Password Reset Request', `<a href="${resetUrl}">Reset Password</a>`);

  res.status(200).json({ success: true, message: 'Password reset link has been sent to your email' });
};

export const resetPassword = async (req: Request, res: Response) => {
  const { token } = req.params;
  const { newPassword } = req.body; 
//   console.log(typeof token);
  if (typeof token !== 'string') {
    res.status(400).json({ success: false, message: 'Invalid token' });
    return;
  }

  try {

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as jwt.JwtPayload;
    const userId = decoded.userId;

    const user = await User.findById(userId);
    // console.log(user);
    if (!user || user.resetPasswordToken !== token) {
        // if(user){
        //     console.log(user.resetPasswordToken);
        // }
        res.status(400).json({ success: false, message: 'Invalid token' });
        return;
    }

    if (!user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
        res.status(400).json({ success: false, message: 'Invalid or expired token' });
        return;
      }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    user.resetPasswordToken = undefined; 
    user.resetPasswordExpires = undefined;
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ success: true, message: 'Password reset successfully' });    
  } catch (error) {
    res.status(400).json({ success: false, message: 'Invalid or expired token' });
  }
};
