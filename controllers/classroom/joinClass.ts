import {Response,NextFunction} from "express";
import {User,Classroom} from "../../models";
import {CustomError,CustomRequest} from "../../types";
import { IUser } from "../../models/User";
import {IClassroom} from "../../models/Classroom";
import jwt from "jsonwebtoken";

const joinClass = async (req: CustomRequest, res: Response, next: NextFunction) => {
    const { code,token } = req.body;
    // console.log(code)
    if (!code && !token) {
        next(new CustomError('Code or token is required', 400));
        return;
    }

    const id = req.user?._id;

    if (!id) {
        next(new CustomError('User not found', 404));
        return;
    }

    try {
        const user = await User.findById(id);
        if (!user) {
            next(new CustomError('User not found', 404));
            return;
        }

        const classroom = await Classroom.findOne({ code }).populate("teacher","name _id")as unknown as IClassroom & {teacher:IUser};
        if (!classroom || classroom.isDeleted) {
            next(new CustomError('Classroom not found', 404));
            return;
        }
        
        if (user.classRooms.includes(classroom._id)) {
            next(new CustomError('Already joined the classroom', 400));
            return;
        }
        if(classroom.privacy === "private" && !token){
            next(new CustomError('Token is required for private classrooms', 400));
            return;
        }
        if(classroom.privacy === "private"){
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {email:string,classroomCode:string};
                if(decoded.classroomCode !== classroom.code){
                    next(new CustomError('Invalid token', 400));
                    return;
                }
                if(decoded.email !== user.email){
                    next(new CustomError('Invalid token', 400));
                    return;
                }
            } catch (error) {
                const err = error as Error;
                next(new CustomError('Invalid token', 400,`${err.message}`));
                return;
            }
        }
        await Promise.all([
            Classroom.updateOne(
              { _id: classroom._id },
              {
                $addToSet: { students: id },
                $pull: { invitedStudents: id }
              }
            ),
            User.updateOne(
              { _id: user._id },
              {
                $addToSet: {
                  classRooms: classroom._id,
                  joinedClassrooms: classroom._id
                }
              }
            )
          ]);
        res.status(200).send({
            success: true,
            message: 'Classroom joined successfully',
            classroom
        });

    } catch (error) {
        const err = error as Error;
        next(new CustomError('Something went wrong', 500,`${err.message}`));
    }
}

export default joinClass;