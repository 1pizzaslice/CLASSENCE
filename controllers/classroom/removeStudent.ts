import {Response , NextFunction} from "express";
import {User,Classroom} from "../../models";
import {CustomError,CustomRequest} from "../../types";

const removeStudent = async(req:CustomRequest,res:Response,next:NextFunction) => {
    const {code,studentId} = req.body;
    if(!code || !studentId){
        next(new CustomError('Code and studentId is required',400));
        return;
    }

    const id = req.user?._id;
    if(!id){
        next(new CustomError('User not found',404));
        return;
    }

    try{
        const user = await User.findById(id);
        if(!user){
            next(new CustomError('User not found',404));
            return;
        }

        const classroom = await Classroom.findOne({code});
        if(!classroom || classroom.isDeleted){
            next(new CustomError('Classroom not found',404));
            return;
        }
        if(!classroom.students.includes(studentId)){
            next(new CustomError('Student not found in the classroom',404));
            return;
        }

        if(classroom.teacher.toString() !== id){
            next(new CustomError('You are not authorized to remove students from this classroom',403));
            return;
        }


        classroom.students = classroom.students.filter((student) => student.toString() !== studentId);
        

        await Promise.all([
            classroom.save(),
            User.updateOne({ _id: studentId }, { $pull: { classRooms: classroom._id,joinedClassrooms: classroom._id
            },
             })
        ]);


        res.status(200).send({
            success:true,
            message:'Student removed successfully',
            classroom:{
                _id:classroom._id,
                code:classroom.code
            }
        });
    }catch(error){
        const err = error as Error;
        next(new CustomError('Something went wrong',500,`${err.message}`));
    }
}

export default removeStudent;