import { Response, Request, NextFunction } from "express";
import { User, Classroom } from "../../models";
import { CustomError, CustomRequest } from "../../types";
import { v4 as uuidv4 } from "uuid";  // UUID generator

function generateUniqueCode(length = 6): string {
  const uuid = uuidv4().replace(/[^a-zA-Z0-9]/g, ''); 
  return uuid.slice(0, length).toUpperCase();
}

export const createClass = async (req: CustomRequest, res: Response, next: NextFunction) => {
  const { name } = req.body;
  if (!name) {
    next(new CustomError('Name is required', 400));
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

    let code = generateUniqueCode();
    let previousClass = await Classroom.findOne({ code });
    while (previousClass) {
      code = generateUniqueCode();
      previousClass = await Classroom.findOne({ code });
    }

    const classroom = new Classroom({
      name,
      code,
      teacher: id,
    });

    await classroom.save();
    user.classRooms.push(classroom._id);
    await user.save();

    res.status(201).send({
      success: true,
      message: 'Classroom created successfully',
      classroom,
    });

  } catch (error) {
    console.log(error);
    next(new CustomError('Something went wrong', 500));
  }
};

export default createClass;