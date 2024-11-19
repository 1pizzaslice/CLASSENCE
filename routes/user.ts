import { Router } from "express";
import { getUserDetails,assignmentPageData } from '../controllers';
const router = Router();

router.post('/details',getUserDetails );
router.get('/assignment',assignmentPageData );

export default router

