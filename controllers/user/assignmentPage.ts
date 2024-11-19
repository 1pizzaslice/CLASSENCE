import { Response, NextFunction } from "express";
import { CustomError, CustomRequest } from "../../types";
import { User, Classroom, Assignment, Submission } from "../../models";
import { IUser } from "../../models/User";
import { IClassroom } from "../../models/Classroom";
import { IAssignment } from "../../models/assignments";

const assignmentPageData = async (req: CustomRequest, res: Response, next: NextFunction) => {
  const id = req.user?._id;
  if (!id) {
    next(new CustomError("User not found", 404));
    return;
  }
  try {
    const user = await User.findById(id)
      .select("name recentGrades classRooms")
      .populate({
        path: "recentGrades",
        select: "assignment marks",
        populate: {
          path: "assignment",
          select: "name classroom",
        },
      })
      .populate({
        path: "classRooms",
        select: "name code subject assignments",
        match: { teacher: { $ne: id } },
        populate: {
          path: "assignments",
          select: "title dueDate submissions", 
          match: { dueDate: { $gte: new Date() } },
          populate: {
            path: "submissions", 
            select: "isGraded",
          },
        },
      }) as IUser & { recentGrades: { assignment: { name: string; classroom: string } }[] } & { classRooms: IClassroom[] };

    if (!user) {
      next(new CustomError("User not found", 404));
      return;
    }

    const createdClassrooms = await Classroom.find({ teacher: id }).select("_id");
    const createdAssignments = await Assignment.find({
        classroom: { $in: createdClassrooms.map((c) => c._id) },
      })
        .select("name dueDate classroom submissions")
        .populate({
          path: "classroom",
          select: "name code subject",
        })
        .sort({ createdAt: -1 });

    const joinedClassesData = await Promise.all(user.classRooms.map(async (classroom: IClassroom) => {
      const assignments = classroom.assignments as unknown as IAssignment[]; 
      const totalAssignments = assignments.length;
      
      const completedAssignments = assignments.filter(a => 
        a.submissions.some((s:any) => s.isGraded === true)
      ).length;

      const overdueAssignments = assignments.filter(a => 
        new Date(a.dueDate) < new Date() && !a.submissions.some((s: any) => s.isGraded === true)
      ).length;

      const dueSoonAssignments = assignments.filter(a => 
        new Date(a.dueDate) > new Date() && 
        new Date(a.dueDate).getTime() - new Date().getTime() < 7 * 24 * 60 * 60 * 1000 && 
        !a.submissions.some((s: any) => s.isGraded === true) && 
        !(new Date(a.dueDate) < new Date()) 
      ).length;

      return {
        classroom: classroom,
        totalAssignments,
        completedAssignments,
        overdueAssignments,
        dueSoonAssignments,
      };
    }));

    const createdClassroomsData = await Promise.all(createdAssignments.map(async (assignment: IAssignment) => {
      const totalSubmissions = await Submission.countDocuments({
        assignment: assignment._id,
      });

      const completedSubmissions = await Submission.countDocuments({
        assignment: assignment._id,
        isGraded: true,
      });

      const notCompletedSubmissions = totalSubmissions - completedSubmissions;

      return {
        classroom: assignment.classroom,
        totalSubmissions,
        completedSubmissions,
        notCompletedSubmissions,
      };
    }));

    res.status(200).json({
      success: true,
      message: "Assignment data fetched successfully!",
      user: {
        name: user.name,
        recentGrades: user.recentGrades,
        joinedClasses: joinedClassesData,
        createdAssignments: createdClassroomsData,
      },
    });
  } catch (error) {
    const err = error as Error;
    next(new CustomError("Failed to get dashboard data", 500, err.message));
  }
};

export default assignmentPageData;
