import { Response, NextFunction } from "express";
import { CustomError, CustomRequest } from "../../types";
import { Assignment, Classroom } from "../../models";
import moment from 'moment-timezone';


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
      assignments = await Assignment.find({ classroom: classroomId })
        .populate({
          path: "submissions",
          select: "marks isGraded student media createdAt",
          populate: { path: "student", select: "name" },
        })
        .sort({ createdAt: -1 });
    } else {
      assignments = await Assignment.find({ classroom: classroomId })
        .populate({
          path: "submissions",
          select: "marks isGraded student media createdAt",
          populate: { path: "student", select: "name" },
          match: { student: req.user?._id },
        })
        .sort({ createdAt: -1 });
    }
    const formattedAssignments = assignments.map(assignment => ({
      ...assignment.toObject(),
      createdAt: moment(assignment.createdAt).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss'),
      dueDate: moment(assignment.dueDate).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss'),
      submissions: assignment.submissions.map((submission: any) => {
        if (typeof submission === 'object' && submission !== null) {
          return {
            ...submission.toObject(),
            createdAt: moment(submission.createdAt).tz('Asia/Kolkata').format('YYYY-MM-DD')
          };
        }
        return submission;
      })
    }));

    res.status(200).json({ success: true, message: "Assignments fetched successfully", assignments: formattedAssignments });
  } catch (error) {
    next(new CustomError("Failed to get assignments", 500, (error as Error).message));
  }
};

export default getAssignments;
