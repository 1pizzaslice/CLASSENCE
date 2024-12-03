import e, { Response, NextFunction } from "express";
import { CustomError, CustomRequest } from "../../types";
import {Assignment,User,Classroom} from '../../models';
import fs from 'fs';
// import {cloudinary} from '../../config'
import { Upload } from '@aws-sdk/lib-storage';
import {S3} from '../../config';
import {v4 as uuidv4} from 'uuid';

const createAssignment = async (req: CustomRequest, res: Response, next: NextFunction) => {
    const { name, description, dueDate,code } = req.body;
  
    if (!name || !description || !dueDate || !req.user || !code) {
      return next(new CustomError("Name, description, dueDate, code and createdBy are required", 400));
    }
  
    const files = req.files as Express.Multer.File[] | undefined;
    const mediaUrls: string[] = []; 

    if(new Date(dueDate)< new Date()){
      next(new CustomError('Due date should be greater than current date',400));
      return;
    }
  
    try {

      const bucketName = process.env.AWS_S3_BUCKET_NAME;
      if (!bucketName) throw new CustomError("AWS S3 bucket name is not configured in environment variables.", 500);

      const [user,classroom] = await Promise.all([User.findById(req.user._id),Classroom.findOne({code})]);
      if(!user){
        next(new CustomError('User not found',404));
        return;
      }
      if(!classroom || classroom.isDeleted){
        next(new CustomError('Classroom not found',404));
        return;
      }
      if(!user.classRooms.includes(classroom._id) || classroom.teacher.toString() !== user._id.toString()){
        next(new CustomError('You are not authorized to create assignment in this classroom',403));
        return;
      }
      // if (files && files.length > 0) {
      //   for (const file of files) {
      //     const result = await cloudinary.uploader.upload(file.path, {
      //       resource_type: "auto",
      //       folder: "assignments", 
      //     });
  
      //     mediaUrls.push(result.secure_url);

      //     try {
      //       await fs.unlink(file.path); // Asynchronous deletion of local file
      //     } catch (err) {
      //       console.error(`Failed to delete local file: ${file.path}`, err);
      //     }
      //   }
      // }

      if (files && files.length > 0) {
        const uploadPromises = files.map(async (file) => {
          const key = `assignments/${uuidv4()}-${file.originalname}`;
          const upload = new Upload({
            client: S3,
            params: {
              Bucket: process.env.AWS_S3_BUCKET_NAME,
              Key: key,
              Body: fs.createReadStream(file.path),
              ContentType: file.mimetype,
            },
          });
          const result = await upload.done();
          fs.unlink(file.path, () => {});
          return result.Location;
        });
      
        // mediaUrls.push(...(await Promise.all(uploadPromises)));
        const resolvedUrls = (await Promise.all(uploadPromises)).filter((location): location is string => {
          if (!location) {
            console.error("S3 upload failed: Location is undefined.");
          }
          return location !== undefined;
        });
        
        
        mediaUrls.push(...resolvedUrls);
      }
  
      const newAssignment = new Assignment({
        name,
        description,
        media: mediaUrls,
        dueDate,
        createdBy: req.user._id,
        classroom: classroom._id,
      });
  
      await Promise.all([newAssignment.save(), classroom.updateOne({ $push: { assignments: newAssignment._id } })]);
  
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