import e, { Response, NextFunction } from "express";
import { CustomError, CustomRequest } from "../../types";
import {Announcement} from '../../models';
import exp from "constants";

// Create a new announcement
const createAnnouncement = async (req: CustomRequest, res: Response , next:NextFunction) => {
  const { title, description, poll, createdBy } = req.body;
  const media = req.files ? (req.files as Express.Multer.File[]).map(file => file.path) : [];

  try {
    const newAnnouncement = new Announcement({
      title,
      description,
      media,
      poll,
      createdBy
    });

    await newAnnouncement.save();
    res.status(201).json({ message: 'Announcement created successfully', announcement: newAnnouncement });
  } catch (error) {
    next(new CustomError('Failed to create announcement', 500));
  }
};

export default createAnnouncement ;