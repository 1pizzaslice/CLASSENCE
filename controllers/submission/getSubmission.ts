
import { Response, NextFunction } from "express";
import { CustomError, CustomRequest } from "../../types";
import { Assignment } from "../../models"; 

const getAllSubmissions = async (req: CustomRequest, res: Response, next: NextFunction) => {
  const { assignmentId } = req.params;

  try {
    const assignment = await Assignment.findById(assignmentId);

    if (!assignment) {
      return next(new CustomError("Assignment not found", 404));
    }

    res.status(200).json({
      success: true,
      submissions: assignment.submissions,
    });
  } catch (error) {
    next(new CustomError("Failed to retrieve submissions", 500, (error as Error).message));
  }
};


const getSubmissionById = async (req: CustomRequest, res: Response, next: NextFunction) => {
  const { assignmentId, submissionId } = req.params;

  try {
    const assignment = await Assignment.findById(assignmentId);

    if (!assignment) {
      return next(new CustomError("Assignment not found", 404));
    }

    const submission = assignment.submissions.find(
      (sub) => sub._id?.toString() === submissionId
    );

    if (!submission) {
      return next(new CustomError("Submission not found", 404));
    }

    res.status(200).json({
      success: true,
      submission,
    });
  } catch (error) {
    next(new CustomError("Failed to retrieve submission", 500, (error as Error).message));
  }
};


export { getAllSubmissions, getSubmissionById };
