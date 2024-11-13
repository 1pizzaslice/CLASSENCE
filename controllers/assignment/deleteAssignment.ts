import { Response, NextFunction } from "express";
import { CustomError, CustomRequest } from "../../types";
import { Assignment } from "../../models";
import { cloudinary } from "../../config";

const deleteAssignment = async (req: CustomRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;

  try {

    if (!req.user) {
      return next(new CustomError("Unauthorized access", 401));
    }

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return next(new CustomError("Assignment not found", 404));
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
