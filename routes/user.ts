import { Router } from "express";
import { getUserDetails } from '../controllers/user';
const router = Router();

router.post('/details',getUserDetails );

export default router

