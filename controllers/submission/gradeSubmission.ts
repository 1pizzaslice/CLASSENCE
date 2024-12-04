import e, { Response,NextFunction } from "express";
import { CustomError,CustomRequest } from "../../types";
import {User,Submission} from '../../models';
import {ISubmission} from '../../models/submission';


const gradeSubmission = async (req:CustomRequest,res:Response,next:NextFunction) => {
    const {submissionId , marks } = req.body;
    if(!submissionId || !req.user || !marks){
        return next(new CustomError('SubmissionId and marks are required',400));
    }
    if (isNaN(marks) || marks < 0 || marks > 100) {
        return next(new CustomError('Invalid Marks', 400));
    }
    
    try {

        const [user,submission] = await Promise.all([User.findById(req.user._id),Submission.findById(submissionId)
            .select("assignment isGraded student marks")
            .populate({
                path: "assignment",
                select: "classroom name",
                populate: {
                    path: "classroom",
                    select: "teacher",
                }
            }) as unknown as ISubmission & {assignment:{classroom:{teacher:{_id:string}},name:string}}
        ]);
        const student = await User.findById(submission.student);

        if(!user){
            next(new CustomError('User not found',404));
            return;
        }
        if(!student){
            next(new CustomError('Student not found',404));
            return;
        }
        if(!submission){
            next(new CustomError('Submission not found',404));
            return;
        }
        if(submission.assignment.classroom.teacher.toString() !== user._id.toString()){
            next(new CustomError('You are not authorized to grade this submission',403));
            return;
        }
        if(!student.recentGrades){
            student.recentGrades = [];
        }
        student.recentGrades = student.recentGrades.filter(id => id.toString() !== submissionId.toString());
        student.recentGrades.unshift(`You got ${marks}/10 marks in ${submission.assignment.name}`);
        student.recentGrades = student.recentGrades.slice(0, 3);

        submission.isGraded = true;
        submission.marks = marks;
        await Promise.all([student.save(),submission.save()]);
        res.status(200).json({
            success:true,
            message:'Submission graded successfully'
        });

    } catch (error) {
        const err = error as Error;
        next(new CustomError('Failed to grade submission',500, `${err.message}`));
    }
}

export default gradeSubmission;