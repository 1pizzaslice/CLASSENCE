import { Router } from "express";
const router = Router();
import { registerUser, loginUser } from '../controllers/auth'
import { registerValidation } from "../middlewares/register-validation";
import { loginValidation } from "../middlewares/login-validation";

router.post('/register', registerValidation, registerUser);
router.post('/login', loginValidation, loginUser);

export default router