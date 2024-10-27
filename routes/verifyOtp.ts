import { Router } from "express";
import { verifyOtp } from '../controllers/verifyOtp';

const router = Router();

router.post('/',verifyOtp);

export default router;