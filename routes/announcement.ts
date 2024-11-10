import { Router } from "express";
const router = Router();

import { createAnnouncement, editAnnouncement ,deleteAnnouncement } from '../controllers/announcement/';
import { fileUploadMiddleware } from "../middlewares";


router.post('/create', fileUploadMiddleware, createAnnouncement);
router.put('/edit/:id', fileUploadMiddleware, editAnnouncement); 
router.delete('/delete/:id', deleteAnnouncement); 

export default router

