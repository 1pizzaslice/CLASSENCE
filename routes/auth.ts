import { Router } from "express";
const router = Router();
import { registerUser, loginUser,requestPasswordReset,resetPassword ,verifyOtp} from '../controllers/'
import { registerValidation } from "../middlewares/register-validation";
import { loginValidation } from "../middlewares/login-validation";

router.post('/register', registerValidation, registerUser);
router.post('/login', loginValidation, loginUser);
router.post("/reset-password", requestPasswordReset);
router.put("/reset-password/:token", resetPassword);
router.post('/verify',verifyOtp);


export default router