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

const editAnnouncement = async (req: CustomRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { title, description, poll } = req.body;
  const files = req.files as Express.Multer.File[] | undefined;

  try {

    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return next(new CustomError('Announcement not found', 404));
    }

    if (title) announcement.title = title;
    if (description) announcement.description = description;
    if (poll) announcement.poll = poll;

    if (files && files.length > 0) {
      // delete old files
      for (const url of announcement.media) {
        const publicId = url.split('/').pop()?.split('.')[0];
        if (publicId) {
          await cloudinary.uploader.destroy(`announcements/${publicId}`);
        }
      }

      // upload new files
      const mediaUrls = [];
      for (const file of files) {
        const result = await cloudinary.uploader.upload(file.path, {
          resource_type: 'auto',
          folder: 'announcements',
        });
        mediaUrls.push(result.secure_url);

        fs.unlink(file.path, (err) => {
          if (err) console.error(`Error deleting local file: ${file.path}`, err);
        });
      }
      announcement.media = mediaUrls;
    }

    await announcement.save();
    res.status(200).json({ message: 'Announcement updated successfully', announcement });
  } catch (error) {
    next(new CustomError('Failed to update announcement', 500));
  }
};


const deleteAnnouncement = async (req: CustomRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;

  try {
    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return next(new CustomError('Announcement not found', 404));
    }

    if (announcement.media && announcement.media.length > 0) {
      for (const url of announcement.media) {
        const publicId = url.split('/').pop()?.split('.')[0];
        if (publicId) {
          await cloudinary.uploader.destroy(`announcements/${publicId}`);
        }
      }
    }

    await announcement.deleteOne();
    res.status(200).json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    next(new CustomError('Failed to delete announcement', 500));
  }
};

export { createAnnouncement , editAnnouncement , deleteAnnouncement };
