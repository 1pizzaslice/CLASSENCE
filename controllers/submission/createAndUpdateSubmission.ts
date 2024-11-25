import e, { Response,NextFunction } from "express";
import { CustomError,CustomRequest } from "../../types";
import {Assignment,User,Submission} from '../../models';
import fs from 'fs/promises';
import {cloudinary} from '../../config'
import { IAssignment } from "../../models/assignments";

const createOrUpdateSubmission = async (req:CustomRequest,res:Response,next:NextFunction) => {
    const {assignmentId } = req.body;
    const files = req.files as Express.Multer.File[] | undefined;
    const mediaUrls: string[] = [];
    if(!assignmentId){
        return next(new CustomError('AssignmentId is required',400));
    }
    try {

        const [user,assignment,submission] = await Promise.all([User.findById(req.user?._id),Assignment.findById(assignmentId).populate({
                path: "classroom",
                select:"teacher",
                populate: {
                    path: "teacher",
                    select: "_id",
                },
            }) as unknown as IAssignment & {classroom:{teacher:{_id:string},_id:string}},Submission.findOne({assignment:assignmentId,student:req.user?._id})]);
        if(!user){
            next(new CustomError('User not found',404));
            return;
        }
        if(!assignment){
            next(new CustomError('Assignment not found',404));
            return;
        }

        if(assignment.classroom.teacher._id.toString() === user._id.toString()){
            next(new CustomError('You cannot submit submission on your own assignment!',403));
            return;
        }
        if(assignment.dueDate < new Date()){
            next(new CustomError('Assignment is locked',400));
            return;
        }
        // console.log(user.classRooms,assignment.classroom._id.toString());
        if(!user.classRooms.includes(assignment.classroom._id.toString())){
            next(new CustomError('You are not authorized to submit in this classroom',403));
            return;
        }
        if (submission && submission.isGraded) {
            return next(new CustomError("Assignment is already graded and cannot be updated", 403));
        }        
        if (!files || files.length === 0) {
            return next(new CustomError("At least one file is required for submission", 400));
        }
        
        if(files && files.length > 0){
            for(const file of files){
                const result = await cloudinary.uploader.upload(file.path,{
                    resource_type:'auto',
                    folder:'submissions'
                });
                mediaUrls.push(result.secure_url);
                try {
                    await fs.unlink(file.path);
                } catch (error) {
                    console.error(`Failed to delete local file: ${file.path}`, error);
                }
            }
        }

        if(submission){
            if (!submission.history) {
                submission.history = [];
            }            
            submission.history.push({
                media:submission.media,
                timestamp:submission.updatedAt,
            });
            submission.media = mediaUrls;
            const submissionId = submission._id as string;
            assignment.submissions = [...(assignment.submissions || []).filter(s => s.toString() !== submissionId.toString()), submission._id as string];
            await submission.save();
        }else{
            const newSubmission = new Submission({
                assignment:assignmentId,
                student:req.user?._id,
                media:mediaUrls,
            });
            await newSubmission.save();
            assignment.submissions = [...(assignment.submissions || []), newSubmission._id as string];
        }
        await assignment.save();
        res.status(201).json({
            success:true,
            message:'Submission created successfully',
        });
    } catch (error) {
        const err = error as CustomError;
        next(new CustomError("Something went wrong", 500,`${err.message}`));
    }
}

export default createOrUpdateSubmission;