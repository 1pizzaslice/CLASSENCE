import mongoose, { Schema, Document, Model } from "mongoose";

export interface IReminder extends Document {
  user: mongoose.Types.ObjectId;
  lecture: mongoose.Types.ObjectId;
  scheduledTime: Date;
  createdAt: Date;
}

const ReminderSchema: Schema = new Schema<IReminder>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lecture: {
      type: Schema.Types.ObjectId,
      ref: "Lecture",
      required: true,
    },
    scheduledTime: {
      type: Date,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const Reminder: Model<IReminder> = mongoose.model<IReminder>("Reminder", ReminderSchema);

export default Reminder;
