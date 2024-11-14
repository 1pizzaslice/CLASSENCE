import { Response, NextFunction } from "express";
import { CustomError, CustomRequest } from "../../types";
import { Assignment } from "../../models"; 
import { Types } from "mongoose";
import type { ISubmission } from "../../models/assignments";

const updateSubmission = async (req: CustomRequest, res: Response, next: NextFunction) => {
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

    const submissionIndex = assignment.submissions.findIndex(
      (submission) => submission.student_id.toString() === studentId.toString()
    );

    if (submissionIndex === -1) {
      return next(new CustomError("No submission found to update", 404));
    }

    const currentSubmission = assignment.submissions[submissionIndex];
    
    const updatedSubmission: ISubmission = {
      ...currentSubmission,
      media: Array.isArray(media) ? media : [],
      version: currentSubmission.version + 1,
      history: [
        ...currentSubmission.history,
        `Submission version ${currentSubmission.version} updated`,
      ],
    };

    assignment.submissions[submissionIndex] = updatedSubmission;

    await assignment.save();

    res.status(200).json({
      success: true,
      message: "Submission updated successfully",
      submission: updatedSubmission,
    });
  } catch (error) {
    next(new CustomError("Failed to update submission", 500, (error as Error).message));
  }
};

export default updateSubmission;
