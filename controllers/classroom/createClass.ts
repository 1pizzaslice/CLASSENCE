import { Response, NextFunction } from "express";
import { User, Classroom } from "../../models";
import { CustomError, CustomRequest } from "../../types";
import { v4 as uuidv4 } from "uuid";  // UUID generator

function generateUniqueCode(length = 6): string {
  const uuid = uuidv4().replace(/[^a-zA-Z0-9]/g, ''); 
  return uuid.slice(0, length).toUpperCase();
}

const createClass = async (req: CustomRequest, res: Response, next: NextFunction) => {
  const { name,subject,privacy } = req.body;
  console.log(req.body);
  if (!name || !subject || !privacy) {
    next(new CustomError('Name, Subject or privacy are required!', 400));
    return;
  }
  if(privacy !== "public" && privacy !== "private"){
    next(new CustomError('Privacy must be either public or private', 400));
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

    const existingClasses = await Classroom.find().select("code").lean();
    const existingCodes = new Set(existingClasses.map((cls) => cls.code));

    let code;
    do {
      code = generateUniqueCode();
    } while (existingCodes.has(code));

    const classroom = new Classroom({
      name,
      code,
      subject,
      privacy,
      teacher: id,
    });

    await classroom.save();
    user.classRooms.push(classroom._id);
    await user.save();

    res.status(201).send({
      success: true,
      message: 'Classroom created successfully',
      classroom:{
        _id:classroom._id,
        code:classroom.code,
        name:classroom.name,
        subject:classroom.subject,
        privacy:classroom.privacy
    }
    });

  } catch (error) {
    const err = error as Error;
    next(new CustomError('Something went wrong',500,`${err.message}`));
  }
};

export default createClass;