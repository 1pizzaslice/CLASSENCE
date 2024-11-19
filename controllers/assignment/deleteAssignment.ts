import { Response, NextFunction } from "express";
import { CustomError, CustomRequest } from "../../types";
import { Assignment, User,Classroom } from "../../models";
import { cloudinary } from "../../config";

const deleteAssignment = async (req: CustomRequest, res: Response, next: NextFunction) => {
  const { id , code } = req.query;

  try {

    if (!req.user) {
      return next(new CustomError("Unauthorized access", 401));
    }

    const [assignment,user,classroom] = await Promise.all([Assignment.findById(id),User.findById(req.user._id),Classroom.findOne({code})]);
    if (!assignment) {
      return next(new CustomError("Assignment not found", 404));
    }
    if(!user){
      return next(new CustomError('User not found',404));
    }
    if(!classroom || classroom.isDeleted){
      return next(new CustomError('Classroom not found',404));
    }
    if(!user.classRooms.includes(classroom._id) || classroom.teacher.toString() !== user._id.toString()){
      return next(new CustomError('You are not authorized to delete assignment in this classroom',403));
    }

    if (assignment.media && assignment.media.length > 0) {
      for (const url of assignment.media) {
        const publicId = url.split('/').pop()?.split('.')[0];
        if (publicId) {
          await cloudinary.uploader.destroy(`assignments/${publicId}`);
        }
      }
    }

    await assignment.deleteOne();

    res.status(200).json({
      success: true,
      message: "Assignment deleted successfully",
    });

  } catch (error) {

    const err = error as Error;
    next(new CustomError("Failed to delete assignment", 500, err.message));
    
  }
};

export default deleteAssignment;
