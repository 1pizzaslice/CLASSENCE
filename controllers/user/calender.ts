import { Response, NextFunction } from "express";
import { CustomError, CustomRequest } from "../../types";
import { User, Lecture, Assignment, Classroom } from "../../models";
import { IAssignment } from "../../models/assignments";
import { IClassroom } from "../../models/Classroom";
import moment from 'moment-timezone';


interface ClassroomDetails {
  classroom: string;
  classroomSubject: string;
  assignments: {
    title: string;
    dueDate: Date;
    isGraded: boolean;
  }[];
  lectures: {
    title: string;
    startTime: Date;
  }[];
}

const calendarPageData = async (req: CustomRequest, res: Response, next: NextFunction) => {
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

    const detailedJoinedClassrooms: ClassroomDetails[] = [];
    const detailedCreatedClassrooms: ClassroomDetails[] = [];

    const classDetails = {
      joined: user.joinedClassrooms as unknown as IClassroom[],
      created: user.createdClassrooms as unknown as IClassroom[],
    };

    const now = new Date();

    const joinedClassPromises = classDetails.joined.map(async (classroom: IClassroom) => {
      const assignments = classroom.assignments as unknown as IAssignment[];

      const upcomingAssignments = assignments.filter(
        (assignment) => new Date(assignment.dueDate) > now
      );

      const upcomingLectures = await Lecture.find({ classroom: classroom._id, startTime: { $gte: now } })
        .populate("teacher classroom")
        .sort({ startTime: 1 });

      const detailedAssignments = upcomingAssignments.map((assignment) => ({
        title: assignment.name,
        dueDate: assignment.dueDate,
        formattedDueDate: moment(assignment.dueDate).tz('Asia/Kolkata').format('MMM D, hh:mm A'),
        isGraded: assignment.submissions.some((submission: any) => submission.isGraded === true),
      }));

      const detailedLectures = upcomingLectures.map((lecture) => ({
        title: lecture.title,
        startTime: lecture.startTime,
        formattedStartTime: moment(lecture.startTime).tz('Asia/Kolkata').format('MMM D, hh:mm A'),
      }));

      detailedJoinedClassrooms.push({
        classroom: classroom.name,
        classroomSubject: classroom.subject,
        assignments: detailedAssignments,
        lectures: detailedLectures,
      });
    });

    const createdClassPromises = classDetails.created.map(async (classroom: IClassroom) => {
      const assignments = classroom.assignments as unknown as IAssignment[];

      const upcomingAssignments = assignments.filter(
        (assignment) => new Date(assignment.dueDate) > now
      );

      const upcomingLectures = await Lecture.find({ classroom: classroom._id, startTime: { $gte: now } })
        .populate("teacher classroom")
        .sort({ startTime: 1 });

      const detailedAssignments = upcomingAssignments.map((assignment) => ({
        title: assignment.name,
        dueDate: assignment.dueDate,
        formattedDueDate: moment(assignment.dueDate).tz('Asia/Kolkata').format('MMM D, hh:mm A'),
        isGraded: assignment.submissions.some((submission: any) => submission.isGraded === true),
      }));

      const detailedLectures = upcomingLectures.map((lecture) => ({
        title: lecture.title,
        startTime: lecture.startTime,
        formattedStartTime: moment(lecture.startTime).tz('Asia/Kolkata').format('MMM D, hh:mm A'),
      }));

      detailedCreatedClassrooms.push({
        classroom: classroom.name,
        classroomSubject: classroom.subject,
        assignments: detailedAssignments,
        lectures: detailedLectures,
      });
    });

    await Promise.all([...joinedClassPromises, ...createdClassPromises]);

    res.status(200).json({
      success: true,
      message: "Calendar data fetched successfully!",
      user: {
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        joinedClassrooms: user.joinedClassrooms.length,
        createdClassrooms: user.createdClassrooms.length,
      },
      details: {
        joined: detailedJoinedClassrooms,
        created: detailedCreatedClassrooms,
      },
    });
  } catch (error) {
    next(new CustomError("Error fetching calendar data", 500));
  }
};

export default calendarPageData;