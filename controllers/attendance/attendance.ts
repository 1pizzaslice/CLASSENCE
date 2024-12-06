import { Response, NextFunction } from "express";
import { CustomError, CustomRequest } from "../../types";
import { User, Classroom, Lecture } from "../../models";
import moment from 'moment-timezone';
import { AttendanceStatus } from "../../models/Lecture";
import { IUser } from "../../models/User";

const getAttendancePageData = async (req: CustomRequest, res: Response, next: NextFunction) => {
  const { classCode } = req.query;
  const userId = req?.user?._id;
  if (!classCode || !userId) {
    next(new CustomError('ClassroomId and UserId is required', 400));
    return;
  }

  try {
    const classroom = await Classroom.findOne({code:classCode}).populate<{ students: IUser[] }>('students', '_id name');
    if (!classroom || classroom.isDeleted) {
      next(new CustomError("Classroom Not Found", 400));
      return;
    }
    const isTeacher = classroom.teacher.toString() === userId.toString();
    const isStudent = classroom.students.some((student: IUser) => student._id.toString() === userId.toString());
    if (!isTeacher && !isStudent) {
      next(new CustomError("You are not authorized to view this class.", 403));
      return;
    }

    const lectures = await Lecture.find({ classroom: classroom._id,status:"Completed" });

    if (isTeacher) {
      let totalPresent = 0;
      let totalLectures = lectures.length * classroom.students.length;

      const lectureData = lectures.map(lecture => {
        const presentStudents = lecture.attendance.filter(att => att.status === AttendanceStatus.Present);
        totalPresent += presentStudents.length;

        return {
          title: lecture.title,
          date: moment(lecture.startTime).tz('Asia/Kolkata').format('D MMM'),
          time: moment(lecture.startTime).tz('Asia/Kolkata').format('hh:mm A'),
          totalPresent: presentStudents.length,
          dateFormatted: moment(lecture.startTime).tz('Asia/Kolkata').format('DD/MM'),
          presentStudents: presentStudents.map(att => ({
            name: classroom.students.find(student => student._id.toString() === att.student.toString())?.name
          }))
        };
      });

      const last7Lectures = lectures.slice(-7).map(lecture => {
        const presentStudents = lecture.attendance.filter(att => att.status === AttendanceStatus.Present);

        return {
          date: moment(lecture.startTime).tz('Asia/Kolkata').format('DD/MM'),
          attendance: presentStudents.length
        };
      });

      res.status(200).json({
        success: true,
        message: "Attendance data fetched successfully",
        totalAbsent: totalLectures - totalPresent,
        totalPresent,
        lectureData,
        last7Lectures,
        isTeacher:true,
      });
    } else if (isStudent) {
      let totalPresent = 0;
      let totalAbsent = 0;
      let currentStreak = 0;
      let longestStreak = 0;

      const lectureData = lectures.map(lecture => {
        const present = lecture.attendance.some(att => att.student.toString() === userId.toString() && att.status === AttendanceStatus.Present);
        let attendance;
        if (present) {
          totalPresent++;
          currentStreak++;
            attendance="Present";
          longestStreak = Math.max(longestStreak, currentStreak);
        } else {
          totalAbsent++;
          currentStreak = 0;
          attendance="Absent";
        }
        

        return {
          title: lecture.title,
          date: moment(lecture.startTime).tz('Asia/Kolkata').format('D MMM'),
          time: moment(lecture.startTime).tz('Asia/Kolkata').format('hh:mm A'),
          attendance,
          totalPresent: lecture.attendance.filter(att => att.status === AttendanceStatus.Present).length,
          dateFormatted: moment(lecture.startTime).tz('Asia/Kolkata').format('DD/MM'),
          presentStudents: lecture.attendance.filter(att => att.status === AttendanceStatus.Present).map(att => ({
            name: classroom.students.find(student => student._id.toString() === att.student.toString())?.name
          }))
        };
      });

      const last7Lectures = lectures.slice(-7).map(lecture => {
        const present = lecture.attendance.some(att => att.student.toString() === userId.toString() && att.status === AttendanceStatus.Present);
        if (!present) {
          currentStreak = 0;
        }

        return {
          dateFormatted: moment(lecture.startTime).tz('Asia/Kolkata').format('DD/MM'),
          totalPresent: lecture.attendance.filter(att => att.status === AttendanceStatus.Present).length
        };
      });

      res.status(200).json({
        success: true,
        message: "Attendance data fetched successfully",
        totalAbsent,
        totalPresent,
        currentStreak,
        longestStreak,
        lectureData,
        last7Lectures,
        isTeacher:false,
      });
    }
  } catch (error) {
    next(new CustomError('Failed to get attendance page data', 500, (error as Error).message));
  }
};

export default getAttendancePageData;