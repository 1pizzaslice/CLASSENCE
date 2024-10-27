import { Router } from "express";
import { verifyOtp } from '../controllers/';

const router = Router();

router.post('/',verifyOtp);

export default router;