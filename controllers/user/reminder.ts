import { Response, NextFunction } from "express";
import Reminder from "../../models/Reminder";
import Lecture from "../../models/Lecture";
import { CustomError, CustomRequest } from "../../types";

export const createReminder = async (req: CustomRequest, res: Response, next: NextFunction) => {
  const { lectureId, scheduledTime } = req.body;
  const userId = req.user?._id;

  if (!userId) {
    next(new CustomError("User not authenticated", 401));
    return;
  }

  try {
    const lectureExists = await Lecture.findById(lectureId);
    if (!lectureExists) {
      next(new CustomError("Lecture not found", 404));
      return;
    }

    const reminder = await Reminder.create({
      user: userId,
      lecture: lectureId,
      scheduledTime,
    });

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
    const reminders = await Reminder.find({ user: userId }).populate("lecture", "title startTime");

    res.status(200).json({
      success: true,
      reminders,
    });
  } catch (error) {
    next(new CustomError("Error fetching reminders", 500));
  }
};

