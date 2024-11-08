import e, { Response, NextFunction } from "express";
import { CustomError, CustomRequest } from "../../types";
import {Announcement} from '../../models';
import fs from 'fs';
import {cloudinary} from '../../config'

const createAnnouncement = async (req: CustomRequest, res: Response , next:NextFunction) => {
  const { title, description, poll, createdBy } = req.body;
  const files = req.files as Express.Multer.File[] | undefined;
  const mediaUrls = []; // cloudinary urls

  try {
    
    if (files && files.length > 0) {
      for (const file of files) {
        const result = await cloudinary.uploader.upload(file.path, {
          resource_type: 'auto',
          folder: 'announcements', // cloudinary folder
        });

        mediaUrls.push(result.secure_url);

        fs.unlink(file.path, (err) => {
          if (err) {
            console.error(`Failed to delete local file: ${file.path}`, err);
          }
        });
      }
    }


    const newAnnouncement = new Announcement({
      title,
      description,
      media: mediaUrls,
      poll,
      createdBy
  });

    await newAnnouncement.save();
    res.status(201).json({ message: 'Announcement created successfully', announcement: newAnnouncement });
  } catch (error) {
    next(new CustomError('Failed to create announcement', 500));
  }
};

export default createAnnouncement;
