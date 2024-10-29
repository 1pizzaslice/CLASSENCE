import { Router } from "express";
const router = Router();
import { registerUser, loginUser,requestPasswordReset,resetPassword ,verifyOtp,resendOtp} from '../controllers/'
import { registerValidation , loginValidation , resetPasswordValidation} from "../middlewares";


router.post('/register', registerValidation, registerUser);
router.post('/login', loginValidation, loginUser);
router.post("/reset-password", requestPasswordReset);
router.put("/reset-password/:token", resetPasswordValidation ,resetPassword);
router.post('/verify',verifyOtp);
router.post("/resend-otp",resendOtp);

export default router