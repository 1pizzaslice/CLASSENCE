import { Reminder } from "../models";
import { CustomError } from "../types";
import { sendEmail } from "./index";
import { IReminder } from "../models/Reminder";
import { IUser } from "../models/User";
import { ILecture } from "../models/Lecture";
import { IAssignment } from "../models/assignments";

interface PopulatedReminder extends Omit<IReminder, "lecture" | "user" | "assignment"> {
  lecture: ILecture & { classroom: { name: string; subject: string } };
  user: IUser;
  assignment:IAssignment & { classroom: { name: string; subject: string } };
}

const sendDueReminders = async (): Promise<void> => {
  try {
    const now = new Date();

    const dueReminders = await Reminder.find({ scheduledTime: { $lte: now } })
      .populate({
        path: "lecture",
        select: "title startTime classroom",
        populate: { path: "classroom", select: "name subject" },
      })
      .populate({
        path:"assignment",
        select:"title dueDate",
        populate:{path:"classroom",select:"name subject"}
      })
      .populate("user", "email name") as unknown as PopulatedReminder[];

    if (dueReminders.length === 0) return;

    const emailPromises = dueReminders.map(async (reminder) => {
      const { user, lecture,assignment } = reminder;

      if (!user || (!lecture && !assignment)) return;
      let emailContent = "";
      if(reminder.reminderType === "assignment" && assignment){
        emailContent = `
          <body style="margin: 0; padding: 0; width: 100%; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <div style="max-width: 600px; width: 100%; margin: 20px auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff; box-sizing: border-box;">
              <div style="text-align: center; margin-bottom: 30px;">
              <img src="https://i.ibb.co/41hPJtW/logo.png" alt="Logo" style="width: 120px; max-width: 100%;">
              </div>
              <p style="color: #333333; font-size: 18px; line-height: 1.5; text-align: center; margin: 0 20px;">
              Hello ${user.name},
              </p>
              <p style="color: #555555; font-size: 16px; line-height: 1.6; text-align: center; margin: 20px 20px;">
              This is a reminder for your upcoming assignment:
              </p>
              <div style="text-align: center; margin: 20px 0;">
              <ul style="list-style-type: none; padding: 0;">
                  <li style="font-size: 16px; color: #555555; margin-bottom: 10px;">
                  <strong>Title:</strong> ${assignment.name}
                  </li>
                  <li style="font-size: 16px; color: #555555; margin-bottom: 10px;">
                  <strong>Subject:</strong> ${assignment.classroom.subject}
                  </li>
                  <li style="font-size: 16px; color: #555555; margin-bottom: 10px;">
                  <strong>Classroom:</strong> ${assignment.classroom.name}
                  </li>
                  <li style="font-size: 16px; color: #555555; margin-bottom: 10px;">
                  <strong>Due Date:</strong> ${new Date(assignment.dueDate).toLocaleString()}
                  </li>
              </ul>
              </div>
              <p style="color: #555555; font-size: 16px; line-height: 1.6; text-align: center; margin: 20px 20px;">
              Don't miss it!
              </p>
              <p style="color: #555555; font-size: 16px; line-height: 1.6; text-align: center; margin: 20px 20px;">
              Best regards,<br>
              Classence Team
              </p>
          </div>
          </body>
        `;
      }else{
        emailContent = `
          <body style="margin: 0; padding: 0; width: 100%; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <div style="max-width: 600px; width: 100%; margin: 20px auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff; box-sizing: border-box;">
              <div style="text-align: center; margin-bottom: 30px;">
              <img src="https://i.ibb.co/41hPJtW/logo.png" alt="Logo" style="width: 120px; max-width: 100%;">
              </div>
              <p style="color: #333333; font-size: 18px; line-height: 1.5; text-align: center; margin: 0 20px;">
              Hello ${user.name},
              </p>
              <p style="color: #555555; font-size: 16px; line-height: 1.6; text-align: center; margin: 20px 20px;">
              This is a reminder for your upcoming lecture:
              </p>
              <div style="text-align: center; margin: 20px 0;">
              <ul style="list-style-type: none; padding: 0;">
                  <li style="font-size: 16px; color: #555555; margin-bottom: 10px;">
                  <strong>Title:</strong> ${lecture.title}
                  </li>
                  <li style="font-size: 16px; color: #555555; margin-bottom: 10px;">
                  <strong>Subject:</strong> ${lecture.classroom.subject}
                  </li>
                  <li style="font-size: 16px; color: #555555; margin-bottom: 10px;">
                  <strong>Classroom:</strong> ${lecture.classroom.name}
                  </li>
                  <li style="font-size: 16px; color: #555555; margin-bottom: 10px;">
                  <strong>Start Time:</strong> ${new Date(lecture.startTime).toLocaleString()}
                  </li>
              </ul>
              </div>
              <p style="color: #555555; font-size: 16px; line-height: 1.6; text-align: center; margin: 20px 20px;">
              Don't miss it!
              </p>
              <p style="color: #555555; font-size: 16px; line-height: 1.6; text-align: center; margin: 20px 20px;">
              Best regards,<br>
              Classence Team
              </p>
          </div>
          </body>
      `;

      }


      await sendEmail(
        user.email,
        `Reminder: Upcoming Lecture "${lecture.title}"`,
        emailContent,
      );

      await Reminder.findByIdAndDelete(reminder._id);
    });

    await Promise.all(emailPromises);
  } catch (error) {
    console.error("Error sending reminders:", error);
    throw new CustomError("Error processing reminders", 500);
  }
};

export default sendDueReminders;