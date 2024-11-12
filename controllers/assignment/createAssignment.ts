import e, { Response, NextFunction } from "express";
import { CustomError, CustomRequest } from "../../types";
import {Assignment} from '../../models';
import fs from 'fs/promises';
import {cloudinary} from '../../config'

const createAssignment = async (req: CustomRequest, res: Response, next: NextFunction) => {
    const { name, description, dueDate } = req.body;
  
    if (!name || !description || !dueDate || !req.user) {
      return next(new CustomError("Name, description, dueDate, and createdBy are required", 400));
    }
  
    const files = req.files as Express.Multer.File[] | undefined;
    const mediaUrls: string[] = []; 
  
    try {
      if (files && files.length > 0) {
        for (const file of files) {
          const result = await cloudinary.uploader.upload(file.path, {
            resource_type: "auto",
            folder: "assignments", 
          });
  
          mediaUrls.push(result.secure_url);

          try {
            await fs.unlink(file.path); // Asynchronous deletion of local file
          } catch (err) {
            console.error(`Failed to delete local file: ${file.path}`, err);
          }
        }
      }
  
      const newAssignment = new Assignment({
        name,
        description,
        media: mediaUrls,
        dueDate,
        createdBy: req.user._id,
      });
  
      await newAssignment.save();
  
      res.status(201).json({ 
        success: true,
        message: "Assignment created successfully",
        assignment: newAssignment });
        
    } catch (error) {
      const err = error as Error;
      next(new CustomError("Failed to create assignment", 500, `${err.message}`));
    }
  };
  
export default createAssignment;