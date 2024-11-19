import { Router } from "express";
const router = Router();

import { createOrUpdateSubmission, gradeSubmission } from '../controllers';
import { fileUploadMiddleware } from "../middlewares";

router.post('/create', fileUploadMiddleware,createOrUpdateSubmission);
router.post('/grade', gradeSubmission); 

export default router;