import {Response,NextFunction} from "express";
import {User} from "../../models";
import {CustomError,CustomRequest} from "../../types";
import { IUser } from "../../models/User";
import {IClassroom} from "../../models/Classroom";

const getUserDetails = async (req: CustomRequest, res: Response, next: NextFunction) => {
    const id = req.user?._id;
    if (!id) {
        next(new CustomError('User not found', 404));
        return;
    }
    try {
        const user = await User.findById(id, "name _id classRooms")
        .populate({
            path: "classRooms",
            select: "name subject _id teacher code",
            populate: {
                path: "teacher",
                select: "name _id", 
            },
        })
        .lean() as IUser & {classRooms:IClassroom[]};
        if (!user) {
            next(new CustomError('User not found', 404));
            return;
        }

        const createdClasses = [];
        const joinedClasses = [];
        if(user.classRooms.length > 0){
            for (const classroom of user.classRooms) {
                if (classroom.teacher._id.toString() === id.toString()) {
                    createdClasses.push({
                        _id: classroom._id,
                        name: classroom.name,
                        subject: classroom.subject,
                        teacher: classroom.teacher,
                        code: classroom.code,
                    });
                } else {
                    joinedClasses.push({
                        _id: classroom._id,
                        name: classroom.name,
                        subject: classroom.subject,
                        teacher: classroom.teacher,
                        code: classroom.code,
                    });
                }
            }
        }
        res.status(200).json({
            success: true,
            user: {
                _id: user._id,
                name: user.name,
                createdAt: user.createdAt,
                createdClasses,
                joinedClasses,
            },
        });
    } catch (error) {
        const err = error as Error;
        next(new CustomError('Failed to get user details', 500, `${err.message}`));
    }
}

export default getUserDetails;