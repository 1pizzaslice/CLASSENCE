import {Response,NextFunction} from "express";
import {User,Classroom} from "../../models";
import {CustomError,CustomRequest} from "../../types";

const getClassroomDetails = async (req: CustomRequest, res: Response, next: NextFunction) => {
    const { code } = req.query;
    const id = req.user?._id;
    if(!id){
        next(new CustomError('User not found', 404));
        return;
    }
    if (!code) {
        next(new CustomError('Code is required', 400));
        return;
    }
    try {
        const [classroom, user] = await Promise.all([
            Classroom.findOne({ code })
                .select("name code subject teacher students announcements createdAt") 
                .populate([
                { path: "teacher", select: "name" },
                { path: "students", select: "name" },
                {
                    path: "announcements",
                    select: "title description media createdAt",
                    options: { sort: { createdAt: -1 } },
                },
                ]),
            User.findById(id),
        ]);
        
        if(!user){
            next(new CustomError('User not found',404));
            return;
        }
        if (!classroom || classroom.isDeleted) {
            next(new CustomError('Classroom not found', 404));
            return;
        }
        if(!user.classRooms.includes(classroom?._id)){
            next(new CustomError('You are not authorized to view this classroom',403));
            return;
        }
        if(!user.recentClasses){
            user.recentClasses = [];
        }
        user.recentClasses = user.recentClasses.filter(id => id.toString() !== classroom._id.toString());
        user.recentClasses.unshift(classroom._id);
        user.recentClasses = user.recentClasses.slice(0, 3);
        await user.save();
        res.status(200).json({success:true,message:"Classroom details fetched successfully!", classroom });
    } catch (error) {
        const err = error as Error;
        next(new CustomError('Failed to get classroom details', 500, `${err.message}`));
    }
}

export default getClassroomDetails;