import { Router } from "express";
const router = Router();

import { createAssignment, updateAssignment ,deleteAssignment ,getAssignments} from '../controllers';
import { fileUploadMiddleware } from "../middlewares";


router.post('/create', fileUploadMiddleware, createAssignment);
router.put('/edit/:id', fileUploadMiddleware, updateAssignment); 
router.delete('/delete/:id', deleteAssignment); 
router.get('/get', getAssignments);

export default router;