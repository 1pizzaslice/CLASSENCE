import { Response, NextFunction } from "express";
import { CustomError, CustomRequest } from "../../types";
import { User, Lecture, Todo } from "../../models";
import { IClassroom } from "../../models/Classroom";
import { IAssignment } from "../../models/assignments";
import { ISubmission } from "../../models/submission";

const dashboardPageData = async (req: CustomRequest, res: Response, next: NextFunction) => {
  const id = req.user?._id;

  if (!id) {
    next(new CustomError("User not found", 404));
    return;
  }

  try {
    const user = await User.findById(id)
      .populate([
        {
          path: "joinedClassrooms",
          select: "name code subject assignments",
          populate: {
            path: "assignments",
            select: "name dueDate submissions",
            populate: { path: "submissions", select: "isGraded" },
          },
        },
        {
          path: "createdClassrooms",
          select: "name code subject assignments students",
          populate: [
            {
              path: "assignments",
              select: "name dueDate submissions",
              populate: { path: "submissions", select: "isGraded" },
            },
            {
              path: "students",
              select: "name email",
            },
          ],
        },
      ]);

    if (!user) {
      next(new CustomError("User not found", 404));
      return;
    }

    const detailedJoinedAssignments: any[] = [];
    const detailedJoinedLectures: any[] = [];
    const detailedCreatedAssignments: any[] = [];
    const detailedCreatedLectures: any[] = [];

    const classDetails = {
      joined: user.joinedClassrooms as unknown as IClassroom[],
      created: user.createdClassrooms as unknown as IClassroom[],
    };

    let totalCompletedAssignmentsJoined = 0;
    let totalDueSoonAssignmentsJoined = 0;
    let totalOverdueAssignmentsJoined = 0;
    let totalUpcomingLecturesJoined = 0;
    let totalAttendanceJoined = 0;

    let totalCompletedAssignmentsCreated = 0;
    let totalDueSoonAssignmentsCreated = 0;
    let totalOverdueAssignmentsCreated = 0;
    let totalUpcomingLecturesCreated = 0;
    let totalStudentsCreated = 0;

    const joinedClassPromises = classDetails.joined.map(async (classroom: IClassroom) => {
      const assignments = classroom.assignments as unknown as IAssignment[];

      // Calculate completed assignments
      const completedAssignments = assignments.filter((assignment) =>
        assignment.submissions.some((submission) => {
          const sub = submission as unknown as ISubmission;
          return sub.isGraded === true;
        })
      ).length;

      // Calculate overdue assignments
      const overdueAssignments = assignments.filter((assignment) =>
        new Date(assignment.dueDate) < new Date() &&
        !assignment.submissions.some((submission) => {
          const sub = submission as unknown as ISubmission;
          return sub.isGraded === true;
        })
      ).length;

      // Calculate due soon assignments
      const dueSoonAssignments = assignments.filter((assignment) =>
        new Date(assignment.dueDate) > new Date() &&
        new Date(assignment.dueDate).getTime() - new Date().getTime() < 7 * 24 * 60 * 60 * 1000 &&
        !assignment.submissions.some((submission) => {
          const sub = submission as unknown as ISubmission;
          return sub.isGraded === true;
        })
      ).length;

      totalCompletedAssignmentsJoined += completedAssignments;
      totalDueSoonAssignmentsJoined += dueSoonAssignments;
      totalOverdueAssignmentsJoined += overdueAssignments;

      detailedJoinedAssignments.push({
        classroom: classroom.name,
        classroomSubject: classroom.subject,
        assignments: assignments.map((assignment) => ({
          title: assignment.name,
          dueDate: assignment.dueDate,
          isGraded: assignment.submissions.some((submission) => {
            const sub = submission as unknown as ISubmission;
            return sub.isGraded === true;
          }),
        })),
      });

      const now = new Date();
      const nextDay = new Date();
      nextDay.setDate(now.getDate() + 1);

      const [lectures] = await Promise.all([
        Lecture.find({ classroom: classroom._id, date: { $gte: now, $lt: nextDay } }),
      ]);

      totalUpcomingLecturesJoined += lectures.length;

      detailedJoinedLectures.push({
        classroom: classroom.name,
        classroomSubject: classroom.subject,
        lectures: lectures.map((lecture) => ({
          title: lecture.title,
          date: lecture.date,
          attendance: lecture.attendance,
        })),
      });

      const attendanceData = await Lecture.aggregate([
        { $match: { classroom: classroom._id } },
        { $unwind: "$attendance" },
        { $group: { _id: "$attendance.student", totalAttendance: { $sum: 1 } } },
      ]);
      totalAttendanceJoined += attendanceData.length;
    });

    const createdClassPromises = classDetails.created.map(async (classroom: IClassroom) => {
      const assignments = classroom.assignments as unknown as IAssignment[];
      const totalStudents = classroom.students.length;

      totalStudentsCreated += totalStudents;

      // Calculate completed assignments for created classrooms
      const completedAssignments = assignments.filter((assignment) =>
        assignment.submissions.some((submission) => {
          const sub = submission as unknown as ISubmission;
          return sub.isGraded === true;
        })
      ).length;

      // Calculate overdue assignments for created classrooms
      const overdueAssignments = assignments.filter((assignment) =>
        new Date(assignment.dueDate) < new Date() &&
        !assignment.submissions.some((submission) => {
          const sub = submission as unknown as ISubmission;
          return sub.isGraded === true;
        })
      ).length;

      // Calculate due soon assignments for created classrooms
      const dueSoonAssignments = assignments.filter((assignment) =>
        new Date(assignment.dueDate) > new Date() &&
        new Date(assignment.dueDate).getTime() - new Date().getTime() < 7 * 24 * 60 * 60 * 1000 &&
        !assignment.submissions.some((submission) => {
          const sub = submission as unknown as ISubmission;
          return sub.isGraded === true;
        })
      ).length;

      totalCompletedAssignmentsCreated += completedAssignments;
      totalDueSoonAssignmentsCreated += dueSoonAssignments;
      totalOverdueAssignmentsCreated += overdueAssignments;

      // Detailed assignments for created classrooms
      detailedCreatedAssignments.push({
        classroom: classroom.name,
        classroomSubject: classroom.subject,
        assignments: assignments.map((assignment) => ({
          title: assignment.name,
          dueDate: assignment.dueDate,
          isGraded: assignment.submissions.some((submission) => {
            const sub = submission as unknown as ISubmission;
            return sub.isGraded === true;
          }),
        })),
      });

      const upcomingLectures = await Lecture.find({ classroom: classroom._id, startTime: { $gte: new Date() } });
      totalUpcomingLecturesCreated += upcomingLectures.length;

      detailedCreatedLectures.push({
        classroom: classroom.name,
        classroomSubject: classroom.subject,
        upcomingLectures: upcomingLectures.map((lecture) => ({
          title: lecture.title,
          startTime: lecture.startTime,
        })),
      });
    });

    // Fetch user's to-do items (not tied to any classroom)
    const userTodos = await Todo.find({ user: id });

    await Promise.all([...joinedClassPromises, ...createdClassPromises]);

    res.status(200).json({
      success: true,
      message: "Dashboard data fetched successfully!",
      user: {
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        joinedClassrooms: user.joinedClassrooms.length,
        createdClassrooms: user.createdClassrooms.length,
      },
      summary: {
        joined: {
          totalAssignmentsCompleted: totalCompletedAssignmentsJoined,
          totalDueSoonAssignments: totalDueSoonAssignmentsJoined,
          totalOverdueAssignments: totalOverdueAssignmentsJoined,
          totalUpcomingLectures: totalUpcomingLecturesJoined,
          totalAttendance: totalAttendanceJoined,
        },
        created: {
          totalAssignmentsCompleted: totalCompletedAssignmentsCreated,
          totalDueSoonAssignments: totalDueSoonAssignmentsCreated,
          totalOverdueAssignments: totalOverdueAssignmentsCreated,
          totalUpcomingLectures: totalUpcomingLecturesCreated,
          totalStudents: totalStudentsCreated,
        },
      },
      details: {
        joined: {
          assignments: detailedJoinedAssignments,
          lectures: detailedJoinedLectures,
        },
        created: {
          assignments: detailedCreatedAssignments, // Added detailed assignments here
          lectures: detailedCreatedLectures,      // Added detailed lectures here
        },
        userTodos: userTodos.map((todo) => ({
          title: todo.title,
          description: todo.description,
          isCompleted: todo.isCompleted,
        })),
      },
    });
  } catch (error) {
    next(new CustomError("Error fetching dashboard data", 500));
  }
};

export default dashboardPageData;
