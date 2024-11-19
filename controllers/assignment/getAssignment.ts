import { Response, NextFunction } from "express";
import { CustomError, CustomRequest } from "../../types";
import { Assignment, Classroom } from "../../models";

const getAssignments = async (req: CustomRequest, res: Response, next: NextFunction) => {
  const { classroomId } = req.query;
  if (!classroomId) return next(new CustomError("ClassroomId is required", 400));

  try {
    const classroom = await Classroom.findById(classroomId);
    if (!classroom) return next(new CustomError("Classroom not found", 404));

    const isTeacher = classroom.teacher.toString() === req.user?._id.toString();
    if (!isTeacher && !classroom.students.includes(req.user?._id as string)) {
      return next(new CustomError("You are not authorized to view this classroom", 403));
    }

    let assignments;
    if (isTeacher) {
      assignments = await Assignment.find({ classroom: classroomId }).populate({
        path: "submissions",
        select: "marks isGraded student media",
        populate: { path: "student", select: "name" },
      });
    } else {
      assignments = await Assignment.find({ classroom: classroomId }).populate({
        path: "submissions",
        select: "marks isGraded student media",
        match: { student: req.user?._id },
      });
    }

    res.status(200).json(assignments);
  } catch (error) {
    next(new CustomError("Failed to get assignments", 500, (error as Error).message));
  }
};

export default getAssignments;