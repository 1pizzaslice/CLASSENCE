import { Lecture, User } from "../../models";
import { IAssignment } from "../../models/assignments";
import { IClassroom } from "../../models/Classroom";
import { AttendanceStatus } from "../../models/Lecture";
import { ISubmission } from "../../models/submission";
import Todo, { ITodo } from "../../models/Todo";
import { CustomError, CustomRequest } from "../../types";
import { Response, NextFunction } from "express";
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
        {
          path:"recentClasses",
          select:"students teacher name subject",
          populate:{
            path:"teacher",
            select:"name"
          }
        }
      ]);

    if (!user) {
      next(new CustomError("User not found", 404));
      return;
    }

    const classDetails = {
      joined: user.joinedClassrooms as unknown as IClassroom[],
      created: user.createdClassrooms as unknown as IClassroom[],
    };

    const detailedJoinedAssignments: any[] = [];
    const detailedJoinedLectures: any[] = [];
    const detailedCreatedAssignments: any[] = [];
    const detailedCreatedLectures: any[] = [];

    let totalAttendancePerClassJoined: { className: string, attendance: number }[] = [];
    let totalAttendancePerClassCreated: { className: string, attendance: number }[] = [];

    const joinedClassPromises = classDetails.joined.map(async (classroom: IClassroom) => {
      const lectures = await Lecture.find({ classroom: classroom._id });

      let totalStudentsInClass = classroom.students.length;
      let totalPresentStudents = 0;

      lectures.forEach((lecture) => {
        totalPresentStudents += lecture.attendance.filter(
          (attendance) => attendance.status === AttendanceStatus.Present
        ).length;
      });

      const averageAttendanceForClass = (totalPresentStudents / totalStudentsInClass) * 100;

      totalAttendancePerClassJoined.push({
        className: classroom.name,
        attendance: averageAttendanceForClass,
      });

      const assignments = classroom.assignments as unknown as IAssignment[];
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

      detailedJoinedLectures.push({
        classroom: classroom.name,
        classroomSubject: classroom.subject,
        lectures: lectures.map((lecture) => ({
          title: lecture.title,
          date: lecture.date,
          attendance: lecture.attendance,
        })),
      });
    });

    const createdClassPromises = classDetails.created.map(async (classroom: IClassroom) => {
      const lectures = await Lecture.find({ classroom: classroom._id });

      let totalStudentsInClass = classroom.students.length;
      let totalPresentStudents = 0;

      lectures.forEach((lecture) => {
        totalPresentStudents += lecture.attendance.filter(
          (attendance) => attendance.status === AttendanceStatus.Present
        ).length;
      });

      const averageAttendanceForClass = (totalPresentStudents / totalStudentsInClass) * 100;

      totalAttendancePerClassCreated.push({
        className: classroom.name,
        attendance: averageAttendanceForClass,
      });

      const assignments = classroom.assignments as unknown as IAssignment[];
      const dueSoonAssignments = assignments
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        .slice(0, 2);

      detailedCreatedAssignments.push({
        classroom: classroom.name,
        classroomSubject: classroom.subject,
        assignments: dueSoonAssignments.map((assignment) => ({
          title: assignment.name,
          dueDate: assignment.dueDate,
          isGraded: assignment.submissions.some((submission) => {
            const sub = submission as unknown as ISubmission;
            return sub.isGraded === true;
          }),
        })),
      });

      const upcomingLectures = await Lecture.find({ classroom: classroom._id, startTime: { $gte: new Date() } });
      detailedCreatedLectures.push({
        classroom: classroom.name,
        classroomSubject: classroom.subject,
        upcomingLectures: upcomingLectures.map((lecture) => ({
          title: lecture.title,
          startTime: lecture.startTime,
        })),
      });
    });

    const userTodos = await Todo.find({ user: id });

    await Promise.all([...joinedClassPromises, ...createdClassPromises]);
    res.status(200).json({
      success: true,
      message: "Dashboard data fetched successfully!",
      user: {
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        recentClasses: user.recentClasses,
      },
      summary: {
        totalCreatedClasses: user.createdClassrooms.length,
        totalJoinedClasses: user.joinedClassrooms.length,
        totalAssignments: (user.createdClassrooms as unknown as IClassroom[]).reduce(
          (sum, classroom) => sum + (classroom.lectures ? classroom.lectures.length:0), 0
        ),
        totalLectures: (user.createdClassrooms as unknown as IClassroom[]).reduce(
          (sum, classroom: IClassroom) => sum + (classroom.lectures ? classroom.lectures.length : 0), 0
        ),
      },
      details: {
        joined: {
          assignments: detailedJoinedAssignments,
          lectures: detailedJoinedLectures,
          averageAttendance: totalAttendancePerClassJoined,
        },
        created: {
          assignments: detailedCreatedAssignments,
          lectures: detailedCreatedLectures,
          averageAttendance: totalAttendancePerClassCreated,
        },
        userTodos: userTodos.map((todo) => ({
          title: todo.title,
          description: todo.description,
          isCompleted: todo.isCompleted,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard data", error);
    next(new CustomError("Error fetching dashboard data", 500));
  }
};



export default dashboardPageData;
