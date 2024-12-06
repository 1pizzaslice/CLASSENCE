import e, { Response, NextFunction } from "express";
import { CustomError, CustomRequest } from "../../types";
import {Announcement, Classroom, User} from '../../models';
import fs from 'fs';
import {cloudinary} from '../../config'
import { Upload } from '@aws-sdk/lib-storage';
import {S3} from '../../config';
import {v4 as uuidv4} from 'uuid';
import { sendEmail } from "../../utility"; 

const createAnnouncement = async (req: CustomRequest, res: Response , next:NextFunction) => {
  const { title, description, poll,code } = req.body;
  if(!title || !description || !req.user || !code){
    next(new CustomError('Title, description, code is required', 400));
    return;
  }
  const files = req.files as Express.Multer.File[] | undefined;
  const mediaUrls: string[] = []; 

  try {
    const data = await Classroom.aggregate([
      { $match: { code } },
      {
        $lookup: {
          from: 'users',
          localField: 'students',
          foreignField: '_id',
          as: 'students'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'teacher',
          foreignField: '_id',
          as: 'teacherInfo'
        }
      },
      {
        $project: {
          _id: 1,
          code: 1,
          teacher: 1,
          teacherInfo: { _id: 1, classRooms: 1 },
          isDeleted: 1,
          students: { _id: 1, email: 1, name: 1 },
          announcements: 1
        }
      }
    ]);

    const classroom = data[0];
    // console.log(classroom);
    if(!classroom || classroom.isDeleted){
      next(new CustomError('Classroom not found',404));
      return;
    }
    const teacher = classroom.teacherInfo[0];
    if (!teacher) {
      next(new CustomError('Teacher not found', 404));
      return;
    }
    

    const isClassroomIncluded = teacher.classRooms.some((room:string) => room.toString() === classroom._id.toString());

    if (!isClassroomIncluded || teacher._id.toString() !== req.user._id.toString()) {
      next(new CustomError('You are not authorized to create announcements in this classroom', 403));
      return;
    }

    if (files && files.length > 0) {
      const uploadPromises = files.map(async (file) => {
        const key = `announcements/${uuidv4()}-${file.originalname}`;
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
    
      const uploadResults = await Promise.all(uploadPromises);
      mediaUrls.push(...uploadResults.filter((url): url is string => url !== undefined));
    }
    

//TODO:SENT NOTIFICATION TO STUDENTS
    const newAnnouncement = new Announcement({
      title,
      description,
      media: mediaUrls,
      poll,
      classroom: classroom._id,
      createdBy:req.user?._id
  });
  
    await Promise.all([
      newAnnouncement.save(),
      Classroom.findByIdAndUpdate(
        classroom._id,
        { $push: { announcements: newAnnouncement._id } },
        { new: true }
      )
    ]);

    const emailPromises = classroom.students.map((student: { email: string; name: string }) => {
      const emailContent = `
      <p>Dear ${student.name},</p>
      <p>A new announcement has been posted in your class:</p>
      <h3>${title}</h3>
      <p>${description}</p>
      ${mediaUrls.length > 0 ? `<p>Attached Media: ${mediaUrls.join(', ')}</p>` : ''}
      <p>Check your classroom for more details.</p>
      <p>Best regards,<br>Classence Team</p>
      `;
      return sendEmail(student.email, 'New Announcement in Your Class', emailContent);
    });

    await Promise.all(emailPromises);
  
    res.status(201).json({success:true, 
      message: 'Announcement created successfully', 
      announcement: newAnnouncement 
    });

  } catch (error) {
    const err = error as Error;
    next(new CustomError('Failed to create announcement',500,`${err.message}`));
  }
};

const editAnnouncement = async (req: CustomRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { title, description, poll,code } = req.body;
  if(!title || !description || !code){
    next(new CustomError('Title, description, code is required', 400));
    return;
  }

  const files = req.files as Express.Multer.File[] | undefined;

  try {

    const [user,announcement,classroom] = await Promise.all([User.findById(req.user?._id),Announcement.findById(id),Classroom.findOne({code})]);
    if(!user){
      next(new CustomError('User not found',404));
      return;
    }
    if(!announcement){
      next(new CustomError('Announcement not found',404));
      return;
    }
    if(!classroom || classroom.isDeleted){
      next(new CustomError('Classroom not found',404));
      return;
    }
    if(!user.classRooms.includes(classroom._id) || classroom.teacher.toString() !== user._id.toString()){
      next(new CustomError('You are not authorized to edit announcement in this classroom',403));
      return;
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
    res.status(200).json({success:true, message: 'Announcement updated successfully', announcement });
  } catch (error) {
    const err = error as Error;
    next(new CustomError('Failed to update announcement',500,`${err.message}`));
  }
};


const deleteAnnouncement = async (req: CustomRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { code } = req.body;
  if(!code){
    next(new CustomError('Code is required', 400));
    return;
  }

  try {
    const [user,announcement,classroom] = await Promise.all([User.findById(req.user?._id),Announcement.findById(id),Classroom.findOne({code})]);
    if(!user){
      next(new CustomError('User not found',404));
      return;
    }
    if(!announcement){
      next(new CustomError('Announcement not found',404));
      return;
    }
    if(!classroom || classroom.isDeleted){
      next(new CustomError('Classroom not found',404));
      return;
    }
    if(!user.classRooms.includes(classroom._id) || classroom.teacher.toString() !== user._id.toString()){
      next(new CustomError('You are not authorized to delete announcement in this classroom',403));
      return;
    }

    if (announcement.media && announcement.media.length > 0) {
      for (const url of announcement.media) {
        const publicId = url.split('/').pop()?.split('.')[0];
        if (publicId) {
          await cloudinary.uploader.destroy(`announcements/${publicId}`);
        }
      }
    }

    await Promise.all([announcement.deleteOne(),classroom.updateOne({$pull:{announcements:announcement._id}})]);
    res.status(200).json({success:true, message: 'Announcement deleted successfully' });
  } catch (error) {
    const err = error as Error;
    next(new CustomError('Failed to delete announcement',500,`${err.message}`));
  }
};

export { createAnnouncement , editAnnouncement , deleteAnnouncement };