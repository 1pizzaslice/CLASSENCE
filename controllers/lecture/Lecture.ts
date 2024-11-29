import { Response, NextFunction } from "express";
import { CustomError, CustomRequest } from "../../types";
import { Lecture , Classroom, User } from "../../models";
import { LectureStatus } from "../../models/Lecture";
import { Server } from "socket.io";
import moment from 'moment-timezone';
import { AttendanceStatus } from "../../models/Lecture";
import { ObjectId } from "mongoose";

const createLecture = async (req: CustomRequest, res: Response, next: NextFunction) => {
    const { title, description, startTime, code } = req.body;

    if (!title || !description || !startTime || !code) {
        return next(new CustomError("Title, description, startTime and classroom code are required", 400));
    }

    if (new Date(startTime) < new Date()) {
        return next(new CustomError("Start time must be in the future", 400));
    }

    try {
        const classroomExists = await Classroom.findOne({ code });
        if (!classroomExists) {
            return next(new CustomError("Classroom not found", 404));
        }

        if (classroomExists.teacher.toString() !== req.user?._id) {
            return next(new CustomError("You are not authorized to create lecture in this classroom", 403));
        }

        const newLecture = new Lecture({
            title,
            description,
            startTime,
            classroom: classroomExists._id,
            teacher: req.user?._id,
            status: "Scheduled"
        });

        classroomExists.lectures.push(newLecture._id as string);
        await Promise.all([newLecture.save(), classroomExists.save()]);

        res.status(201).json({
            success: true,
            message: "Lecture created successfully",
            newLecture
        });
    } catch (error) {
        next(new CustomError("Failed to create lecture", 500, (error as Error).message));
    }
};

const getLectures = async (req: CustomRequest, res: Response, next: NextFunction) => {
    const { code } = req.query;
    if (!code) {
        return next(new CustomError("Classroom code is required", 400));
    }

    if (!req.user?._id) {
        return next(new CustomError("User not found", 404));
    }

    try {
        const classroom = await Classroom.findOne({ code });
        if (!classroom) {
            return next(new CustomError("Classroom not found", 404));
        }

        if (classroom.teacher.toString() !== req.user?._id && !classroom.students.includes(req.user?._id)) {
            return next(new CustomError("You are not authorized to view this classroom", 403));
        }

        const allLectures = await Lecture.find({ classroom: classroom._id })
            .populate({
                path: 'teacher',
                select: 'name email',
            })
            .populate({
                path: 'classroom',
                select: 'name subject code',
            })
            .sort({ startTime: 1 });

        const futureLectures = await Lecture.find({ 
                classroom: classroom._id,
                startTime: { $gt: new Date(),
                status: "Scheduled"
                 }
            })
            .populate({
                path: 'teacher',
                select: 'name email',
            })
            .populate({
                path: 'classroom',
                select: 'name subject code',
            })
            .sort({ startTime: 1 });
            const formattedAllLectures = allLectures.map(lecture => ({
                ...lecture.toObject(),
                startTime: moment(lecture.startTime).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss'),
                createdAt: moment(lecture.createdAt).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss'),
            }));
    
            const formattedFutureLectures = futureLectures.map(lecture => ({
                ...lecture.toObject(),
                startTime: moment(lecture.startTime).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss'),
                createdAt: moment(lecture.createdAt).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss'),
            }));
        res.status(200).json({
            success: true,
            message: "Lectures fetched successfully",
            allLectures: formattedAllLectures,
            futureLectures: formattedFutureLectures
        });
    } catch (error) {
        next(new CustomError("Failed to get lectures", 500, (error as Error).message));
    }
};

const deleteLecture = async (req: CustomRequest, res: Response, next: NextFunction) => {
    const { lectureId } = req.query;
    if (!lectureId) {
        return next(new CustomError("LectureId is required", 400));
    }

    try {
        const lecture = await Lecture.findById(lectureId);
        if (!lecture) {
            return next(new CustomError("Lecture not found", 404));
        }
        const classroom = await Classroom.findById(lecture.classroom);
        if (!classroom) {
            return next(new CustomError("Classroom not found", 404));
        }

        if (classroom.teacher.toString() !== req.user?._id) {
            return next(new CustomError("You are not authorized to delete this lecture", 403));
        }

        await lecture.deleteOne();
        res.status(200).json({
            success: true,
            message: "Lecture deleted successfully",
        });
    } catch (error) {
        next(new CustomError("Failed to delete lecture", 500, (error as Error).message));
    }
};

const updateLecture = async (req: CustomRequest, res: Response, next: NextFunction) => {
    const { title, description, startTime, status } = req.body;
    const { lectureId } = req.query;

    if (!title && !description && !startTime && !status) {
        return next(new CustomError("At least one field (title, description, startTime, status) is required", 400));
    }

    try {
        const lecture = await Lecture.findById(lectureId);
        if (!lecture) {
            return next(new CustomError("Lecture not found", 404));
        }

        const classroom = await Classroom.findById(lecture.classroom);
        if (!classroom) {
            return next(new CustomError("Classroom not found", 404));
        }

        if (classroom.teacher.toString() !== req.user?._id) {
            return next(new CustomError("You are not authorized to update this lecture", 403));
        }

        if (title) lecture.title = title;
        if (description) lecture.description = description;
        if (startTime) lecture.startTime = new Date(startTime);
        if (status) lecture.status = status;

        await lecture.save();
        res.status(200).json({
            success: true,
            message: "Lecture updated successfully",
            updatedLecture: lecture
        });
    } catch (error) {
        next(new CustomError("Failed to update lecture", 500, (error as Error).message));
    }
};

const joinLecture = async (req: CustomRequest, res: Response, next: NextFunction) => {

}


interface StartSessionParams {
    lectureId: string;
    socketServer: Server;
    req: CustomRequest;
    res: Response;
    next: NextFunction;
}

 const startLiveSession = async ({req,res,next, lectureId, socketServer }: StartSessionParams): Promise<string> => {
    try {
        const lecture = await Lecture.findById(lectureId);

        if (!lecture) {
            throw new CustomError("Lecture not found", 404);
        }
        if(lecture.teacher.toString() !== req.user?._id){
            throw new CustomError("You are not authorized to start this lecture", 403);
        }
        if (lecture.status !== LectureStatus.Scheduled) {
            throw new CustomError(`Lecture is currently ${lecture.status}`, 400);
        }


        const roomName = `lecture-${lectureId}`;
        socketServer.to(roomName).emit("session-started", { message: "Live session has started." });
        lecture.status = LectureStatus.InProgress;
        await lecture.save();
        console.log(`Live session started for lecture: ${lectureId}`);
        return roomName;
    } catch (error) {
        console.error(`Error starting live session for lecture ${lectureId}:`, error);
        throw new CustomError("Failed to start live session", 500, (error as Error).message);
    }
};

 const stopLiveSession = async (req:CustomRequest,res:Response,next:NextFunction,lectureId: string, socketServer: Server): Promise<void> => {
    try {
        const lecture = await Lecture.findById(lectureId);

        if (!lecture) {
            throw new CustomError("Lecture not found", 404);
        }
        if(lecture.teacher.toString() !== req.user?._id){
            throw new CustomError("You are not authorized to stop this lecture", 403);
        }
        if (lecture.status !== LectureStatus.InProgress) {
            throw new CustomError(`Lecture is Currently ${lecture.status}`, 400);
        }

        const roomName = `lecture-${lectureId}`;
        socketServer.to(roomName).emit("session-ended", { message: "Live session has ended." });

        lecture.status = LectureStatus.Completed;
        await lecture.save();

        console.log(`Live session stopped and status updated to Completed for lecture: ${lectureId}`);
    } catch (error) {
        console.error(`Error stopping live session for lecture ${lectureId}:`, error);
        throw new CustomError("Failed to stop live session", 500, (error as Error).message);
    }
};


const markAttendance = async (req: CustomRequest, res: Response, next: NextFunction) => {
    const { lectureId } = req.body;
    const id = req.user?._id;
    if (!lectureId  || !id) {
        next(new CustomError("LectureId, studentId are required", 400));
        return;
    }

    try {
        const [lecture,user] = await Promise.all([ Lecture.findById(lectureId),User.findById(id)]);
        if (!lecture) {
            next(new CustomError("Lecture not found", 404));
            return;
        }
        if(!user){
            next(new CustomError("User not found", 404));
            return;
        }
        if(user.joinedClassrooms.indexOf(lecture.classroom.toString()) === -1){
            next(new CustomError("You are not authorized to mark attendance for this lecture", 403));
            return;
        }
        if (lecture.status !== LectureStatus.InProgress || lecture.youtubeLiveStreamURL === "") {
            next(new CustomError("Lecture is not in progress", 400));
            return;
        }
        const attendanceRecord = lecture.attendance.find(record => record.student.toString() === id);

        if (attendanceRecord) {
            attendanceRecord.status = AttendanceStatus.Present;
        } else {
            lecture.attendance.push({
                student: user._id as unknown as ObjectId,
                status: AttendanceStatus.Present
            });
        }
        await lecture.save();

        res.status(200).json({
            success: true,
            message: "Attendance marked successfully",
            lecture:{
                title: lecture.title,
                description: lecture.description,
                startTime: moment(lecture.startTime).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss'),
                status: lecture.status,
                classroom: lecture.classroom,
                youtubeLiveStreamURL: lecture.youtubeLiveStreamURL,
            }
        });
    } catch (error) {
        next(new CustomError("Failed to mark attendance", 500, (error as Error).message));
    }
}
export {markAttendance, createLecture, getLectures, deleteLecture, updateLecture , startLiveSession, stopLiveSession};
