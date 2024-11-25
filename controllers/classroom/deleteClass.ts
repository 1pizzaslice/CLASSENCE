import {Response,NextFunction} from "express";
import {User,Classroom} from "../../models";
import {CustomError,CustomRequest} from "../../types";

const deleteClass = async(req:CustomRequest,res:Response,next:NextFunction) => {
    const {code} = req.body;
    if(!code){
        next(new CustomError('Classroom id is required',400));
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

        if(classroom.teacher.toString() !== id){
            next(new CustomError('You are not authorized to delete this classroom',403));
            return;
        }

        classroom.isDeleted = true;
        await Promise.all([
            User.updateMany(
              { 
                $or: [
                  { classRooms: classroom._id },
                  { joinedClasses: classroom._id },
                  { joinedClassrooms: classroom._id },
                  { createdClassrooms: classroom._id }
                ]
              },
              {
                $pull: {
                  classRooms: classroom._id,
                  joinedClasses: classroom._id,
                  joinedClassrooms: classroom._id,
                  createdClassrooms: classroom._id
                }
              }
            ),
            classroom.save()
          ]);
        res.status(200).send({
            success:true,
            message:'Classroom deleted successfully',
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

export default deleteClass;