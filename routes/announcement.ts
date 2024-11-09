import { Router } from "express";
const router = Router();

import { createAnnouncement, editAnnouncement ,deleteAnnouncement } from '../controllers/announcement/';
import { fileUploadMiddleware } from "../middlewares";


router.post('/announcement/create', fileUploadMiddleware, createAnnouncement);
router.put('/announcement/edit/:id', fileUploadMiddleware, editAnnouncement); 
router.delete('/announcement/delete/:id', deleteAnnouncement); 

export default router

