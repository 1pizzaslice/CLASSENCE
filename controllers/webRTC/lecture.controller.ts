import { Response, NextFunction } from "express";
import { CustomError, CustomRequest } from "../../types";
import { Lecture , Classroom } from "../../models";
import { LectureStatus } from "../../models/Lecture";

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

        const lectures = await Lecture.find({ classroom: classroom._id })
            .populate({
                path: 'teacher',
                select: 'name email',
            })
            .populate({
                path: 'classroom',
                select: 'name subject code',
            })
            .sort({ startTime: 1 });

        res.status(200).json({
            success: true,
            message: "Lectures fetched successfully",
            lectures
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

const startLecture = async (req: CustomRequest, res: Response, next: NextFunction) => {
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
            return next(new CustomError("You are not authorized to start this lecture", 403));
        }

        if (lecture.status === "InProgress") {
            return next(new CustomError("Lecture is already in progress", 400));
        }

        lecture.status = LectureStatus.InProgress;
        await lecture.save();

        res.status(200).json({
            success: true,
            message: "Lecture started successfully",
            lecture
        });
    } catch (error) {
        next(new CustomError("Failed to start lecture", 500, (error as Error).message));
    }
};

const endLecture = async (req: CustomRequest, res: Response, next: NextFunction) => {
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
            return next(new CustomError("You are not authorized to end this lecture", 403));
        }

        if (lecture.status === "Completed") {
            return next(new CustomError("Lecture has already been completed", 400));
        }

        lecture.status = LectureStatus.Completed;
        await lecture.save();

        res.status(200).json({
            success: true,
            message: "Lecture ended successfully",
            lecture
        });
    } catch (error) {
        next(new CustomError("Failed to end lecture", 500, (error as Error).message));
    }
};


export { createLecture, getLectures, deleteLecture, updateLecture , startLecture, endLecture};
