import { Response, NextFunction } from "express";
import { CustomError, CustomRequest } from "../../types";
import { Assignment } from '../../models';
import fs from 'fs';
// import { cloudinary } from '../../config';
import { IAssignment } from "../../models/assignments";
import { Upload } from "@aws-sdk/lib-storage";
import { S3 } from "../../config";
import { v4 as uuidv4 } from "uuid";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";

const deleteS3Object = async (bucketName: string, key: string) => {
  try {
    const deleteCommand = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    await S3.send(deleteCommand);
    console.log(`Successfully deleted ${key} from S3.`);
  } catch (error) {
    console.error(`Failed to delete ${key} from S3:`, error);
    throw new Error(`Error deleting S3 object: ${key}`);
  }
};

const updateAssignment = async (req: CustomRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { name, description, dueDate } = req.body;
  const files = req.files as Express.Multer.File[] | undefined;
  const newMediaUrls: string[] = [];

  try {

    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    if (!bucketName) {
      throw new CustomError("AWS S3 bucket name is not configured in environment variables.", 500);
    }

    const assignment = await Assignment.findById(id)
    .populate({
        path: "classroom",
        select:"teacher",
        populate: {
            path: "teacher",
            select: "_id",
        },
    })as unknown as IAssignment & {classroom:{teacher:{_id:string}}} ;

    if (!assignment) {
      return next(new CustomError("Assignment not found", 404));
    }
    if(assignment.dueDate < new Date()){
      return next(new CustomError('Assignment is locked',400));
    }

    if(assignment.classroom.teacher._id.toString() !== req.user?._id.toString()){
      return next(new CustomError('You are not authorized to update this assignment',403));
    }

    if (name) assignment.name = name;
    if (description) assignment.description = description;
    if (dueDate) assignment.dueDate = dueDate;

    // if (files && files.length > 0) {
    //     if (assignment.media && assignment.media.length > 0) {
    //       for (const url of assignment.media) {
    //         const publicId = url.split('/').pop()?.split('.')[0];
    //         if (publicId) {
    //           await cloudinary.uploader.destroy(`assignments/${publicId}`);
    //         }
    //       }
    //     }

    //   for (const file of files) {
    //     const result = await cloudinary.uploader.upload(file.path, {
    //       resource_type: "auto",
    //       folder: "assignments",
    //     });
    //     newMediaUrls.push(result.secure_url);

    //     try {
    //       await fs.unlink(file.path);
    //     } catch (err) {
    //       console.error(`Failed to delete local file: ${file.path}`, err);
    //     }
    //   }

    //   assignment.media = [...(assignment.media || []), ...newMediaUrls];
    // }

    if (files && files.length > 0) {

      // Delete existing media from S3
      if (assignment.media && assignment.media.length > 0) {
        const deletePromises = assignment.media.map(async (url) => {
          const key = url.split(`${bucketName}/`)[1];
          if (key) {
            const deleteCommand = new DeleteObjectCommand({
              Bucket: bucketName,
              Key: key,
            });
            await S3.send(deleteCommand);
          }
        });
        await Promise.all(deletePromises);
      }

      const uploadPromises = files.map(async (file) => {
        const key = `assignments/${uuidv4()}-${file.originalname}`;
        const upload = new Upload({
          client: S3,
          params: {
            Bucket: bucketName,
            Key: key,
            Body: fs.createReadStream(file.path),
            ContentType: file.mimetype,
          },
        });
        const result = await upload.done();
        fs.unlink(file.path, (err) => {
          if (err) {
            console.error(`Failed to delete local file: ${file.path}`, err);
          }
        });
        return result.Location;
      });

      const resolvedUrls = (await Promise.all(uploadPromises)).filter((location): location is string => {
        if (!location) {
          console.error("S3 upload failed: Location is undefined.");
        }
        return location !== undefined;
      });

      assignment.media = resolvedUrls; 
    }

    await assignment.save();

    res.status(200).json({
      success: true,
      message: "Assignment updated successfully",
      assignment,
    });

  } catch (error) {
    const err = error as Error;
    next(new CustomError("Failed to update assignment", 500, `${err.message}`));
  }
};

export default updateAssignment;