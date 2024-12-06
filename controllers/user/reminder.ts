import { Response, NextFunction } from "express";
import {Reminder,Lecture, Assignment} from "../../models/";
import { CustomError, CustomRequest } from "../../types";
import moment from "moment-timezone";

export const createReminder = async (req: CustomRequest, res: Response, next: NextFunction) => {
  const { lectureId, scheduledTime,assignmentId } = req.body;
  //TODO:ADD SUPPORT FOR ASSIGNMENT
  const userId = req.user?._id;

  if (!userId) {
    next(new CustomError("User not authenticated", 401));
    return;
  }
  if ((!lectureId && !assignmentId) || !scheduledTime) {
    next(new CustomError("Lecture ID/Assignment ID and scheduled time are required", 400));
    return;
    }
    if(scheduledTime < new Date()){
      next(new CustomError("Cannot set reminder for past time", 400));
      return;
    }

  try {
    let reminder;
    if(lectureId){
      const lectureExists = await Lecture.findById(lectureId);
      if (!lectureExists) {
        next(new CustomError("Lecture not found", 404));
        return;
      }
      if(lectureExists.startTime < new Date()){
          next(new CustomError("Cannot set reminder for past lectures", 400));
          return;
      }
      reminder = await Reminder.create({
        user: userId,
        lecture: lectureId,
        scheduledTime,
        reminderType:"lecture"
      });
    }else{
      const assignmentExists = await Assignment.findById(assignmentId);
      if (!assignmentExists) {
        next(new CustomError("Assignment not found", 404));
        return;
      }
      if(assignmentExists.dueDate < new Date()){
          next(new CustomError("Cannot set reminder for past assignments", 400));
          return;
      }
      reminder = await Reminder.create({
        user: userId,
        assignment: assignmentId,
        scheduledTime,
        reminderType:"assignment"
      });
    }

    res.status(201).json({
      success: true,
      message: "Reminder created successfully!",
      reminder,
    });
  } catch (error) {
    next(new CustomError("Error creating reminder", 500));
  }
};

export const updateReminder = async (req: CustomRequest, res: Response, next: NextFunction) => {
  const { reminderId } = req.params;
  const { scheduledTime } = req.body;
  if(!scheduledTime){
    next(new CustomError("Scheduled time is required", 400));
    return;
  }

  try {
    const updatedReminder = await Reminder.findByIdAndUpdate(
      reminderId,
      { scheduledTime },
      { new: true }
    );

    if (!updatedReminder) {
      next(new CustomError("Reminder not found", 404));
      return;
    }

    res.status(200).json({
      success: true,
      message: "Reminder updated successfully!",
      updatedReminder,
    });
  } catch (error) {
    next(new CustomError("Error updating reminder", 500));
  }
};

export const deleteReminder = async (req: CustomRequest, res: Response, next: NextFunction) => {
  const { reminderId } = req.params;
  if (!reminderId) {
    next(new CustomError("Reminder ID is required", 400));
    return;
  }

  try {
    const deletedReminder = await Reminder.findByIdAndDelete(reminderId);

    if (!deletedReminder) {
      next(new CustomError("Reminder not found", 404));
      return;
    }

    res.status(200).json({
      success: true,
      message: "Reminder deleted successfully!",
    });
  } catch (error) {
    next(new CustomError("Error deleting reminder", 500));
  }
};

export const getAllReminders = async (req: CustomRequest, res: Response, next: NextFunction) => {
  const userId = req.user?._id;

  if (!userId) {
    next(new CustomError("User not authenticated", 401));
    return;
  }

  try {
    const reminders = await Reminder.find({ user: userId }).populate("lecture", "title startTime").populate("assignment","title dueDate");
    const formattedReminders = reminders.map(reminder => ({
      ...reminder.toObject(),
      scheduledTime: moment(reminder.scheduledTime).tz('Asia/Kolkata').format('MMM D, hh:mm A')
    }));
    res.status(200).json({
      success: true,
      reminders:formattedReminders,
    });
  } catch (error) {
    next(new CustomError("Error fetching reminders", 500));
  }
};
