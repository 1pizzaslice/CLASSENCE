import { Response, NextFunction } from "express";
import { CustomError, CustomRequest } from "../../types";
import { Assignment } from "../../models"; 
import { Types } from "mongoose";
import type { ISubmission } from "../../models/assignments";

const addSubmission = async (req: CustomRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;  
  const { media } = req.body; 

  try {

    if (!req.user) {
      return next(new CustomError("Unauthorized access", 401));
    }

    const studentId = new Types.ObjectId(req.user._id);

    const assignment = await Assignment.findById(id);
    
    if (!assignment) {
      return next(new CustomError("Assignment not found", 404));
    }

    const existingSubmission = assignment.submissions.find(
      (submission) => submission._id?.toString() === studentId.toString()
    );

    if (existingSubmission) {
      return next(new CustomError("You have already submitted this assignment", 400));
    }

    const newSubmission : ISubmission = {
      student_id: studentId,  
      media: Array.isArray(media) ? media : [],
      version: 1, 
      history: [`Submission version 1`], 
      isGraded: false,
      isDeleted: false,
    };

    assignment.submissions.push(newSubmission);

    await assignment.save();

    res.status(201).json({
      success: true,
      message: "Submission added successfully",
      submission: newSubmission,
    });

  } catch (error) {

    const err = error as Error;
    next(new CustomError("Failed to add submission", 500, err.message));
    
  }
};

export default addSubmission;
