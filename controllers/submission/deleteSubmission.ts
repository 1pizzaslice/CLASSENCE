import { Response, NextFunction } from "express";
import { CustomError, CustomRequest } from "../../types";
import { Assignment } from "../../models"; 

const deleteSubmission = async (req: CustomRequest, res: Response, next: NextFunction) => {
  const { assignmentId, submissionId } = req.params;

  try {
    const assignment = await Assignment.findById(assignmentId);

    if (!assignment) {
      return next(new CustomError("Assignment not found", 404));
    }

    const submissionIndex = assignment.submissions.findIndex(
      (submission) => submission._id?.toString() === submissionId
    );

    if (submissionIndex === -1) {
      return next(new CustomError("Submission not found", 404));
    }

    const deletedSubmission = assignment.submissions[submissionIndex];

    if (deletedSubmission.isDeleted) {
        return next(new CustomError("Submission is already marked as deleted", 400));
    }
      
    deletedSubmission.isDeleted = true;

    deletedSubmission.history.push(`Submission was marked as deleted on ${new Date().toISOString()}`);

    assignment.submissions[submissionIndex] = deletedSubmission;

    await assignment.save();

    res.status(200).json({
      success: true,
      message: "Submission marked as deleted successfully",
      submission: deletedSubmission,
      assignment: assignment 
    });
  } catch (error) {
    next(new CustomError("Failed to delete submission", 500, (error as Error).message));
  }
};

export default deleteSubmission;
