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
      .select("name recentGrades classRooms createdClassrooms")
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
        select: "name code subject assignments teacher students",
        populate: {
          path: "assignments",
          select: "title dueDate submissions",
          populate: {
            path: "submissions",
            select: "isGraded",
          },
        },
      }) as IUser & { classRooms: IClassroom[] };

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

    let totalJoinedAssignments = 0;
    let completedJoinedAssignments = 0;
    let overdueJoinedAssignments = 0;
    let dueSoonJoinedAssignments = 0;

    const joinedClassesData = user.classRooms.map((classroom: IClassroom) => {
      const assignments = classroom.assignments as unknown as IAssignment[];

      const totalAssignments = assignments.length;
      const completedAssignments = assignments.filter((a) =>
        a.submissions.some((s: any) => s.isGraded === true)
      ).length;

      const overdueAssignments = assignments.filter((a) =>
        new Date(a.dueDate) < new Date() && !a.submissions.some((s: any) => s.isGraded === true)
      ).length;

      const dueSoonAssignments = assignments.filter((a) =>
        new Date(a.dueDate) > new Date() &&
        new Date(a.dueDate).getTime() - new Date().getTime() < 7 * 24 * 60 * 60 * 1000 &&
        !a.submissions.some((s: any) => s.isGraded === true) &&
        !(new Date(a.dueDate) < new Date())
      ).length;

      if (classroom.teacher.toString() !== id.toString()) {
        totalJoinedAssignments += totalAssignments;
        completedJoinedAssignments += completedAssignments;
        overdueJoinedAssignments += overdueAssignments;
        dueSoonJoinedAssignments += dueSoonAssignments;
      }

      return {
        classroom: classroom,
        totalAssignments,
        completedAssignments,
        overdueAssignments,
        dueSoonAssignments,
      };
    });

    let totalCreatedAssignments = 0;
    let totalCreatedSubmissions = 0;
    let completedCreatedSubmissions = 0;

    const createdClassroomsData = createdAssignments.map((assignment: IAssignment) => {
      const totalSubmissions = assignment.submissions.length;

      const completedSubmissions = assignment.submissions.filter((s: any) => s.isGraded === true)
        .length;

      const notCompletedSubmissions = totalSubmissions - completedSubmissions;

      totalCreatedAssignments++;
      totalCreatedSubmissions += totalSubmissions;
      completedCreatedSubmissions += completedSubmissions;

      return {
        classroom: assignment.classroom,
        totalSubmissions,
        completedSubmissions,
        notCompletedSubmissions,
      };
    });

    const notCompletedCreatedSubmissions =
      totalCreatedSubmissions - completedCreatedSubmissions;

    res.status(200).json({
      success: true,
      message: "Assignment data fetched successfully!",
      user: {
        name: user.name,
        recentGrades: user.recentGrades,
        joinedClasses: {
          totalClasses: user.classRooms.filter((classroom: IClassroom) => classroom.students.includes(id)).length,
          totalAssignments: totalJoinedAssignments,
          completedAssignments: completedJoinedAssignments,
          overdueAssignments: overdueJoinedAssignments,
          dueSoonAssignments: dueSoonJoinedAssignments,
          perClassroomData: joinedClassesData,
        },
        createdAssignments: {
          totalClasses: createdClassrooms.length,
          totalAssignments: totalCreatedAssignments,
          totalSubmissions: totalCreatedSubmissions,
          completedSubmissions: completedCreatedSubmissions,
          notCompletedSubmissions: notCompletedCreatedSubmissions,
          perClassroomData: createdClassroomsData,
        },
      },
    });
  } catch (error) {
    const err = error as Error;
    next(new CustomError("Failed to get assignment data", 500, err.message));
  }
};

export default assignmentPageData;
