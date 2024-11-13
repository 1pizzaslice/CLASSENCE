import { Response, NextFunction } from "express";
import { CustomError, CustomRequest } from "../../types";
import { Assignment } from "../../models";

const getAllAssignments = async (req: CustomRequest, res: Response, next: NextFunction) => {
  try {

    if (!req.user) {
      return next(new CustomError("Unauthorized access", 401));
    }

    const assignments = await Assignment.find().populate("submissions.student_id", "name email");

    res.status(200).json({
      success: true,
      message: "Assignments retrieved successfully",
      assignments,
    });

  } catch (error) {

    const err = error as Error;
    next(new CustomError("Failed to retrieve assignments", 500, err.message));

  }
};



const getAssignmentById = async (req: CustomRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;

  try {

    if (!req.user) {
      return next(new CustomError("Unauthorized access", 401));
    }

    const assignment = await Assignment.findById(id).populate("submissions.student_id", "name email");

    if (!assignment) {
      return next(new CustomError("Assignment not found", 404));
    }

    res.status(200).json({
      success: true,
      message: "Assignment retrieved successfully",
      assignment,
    });

  } catch (error) {

    const err = error as Error;
    next(new CustomError("Failed to retrieve assignment", 500, err.message));

  }
};

export { getAllAssignments, getAssignmentById };
