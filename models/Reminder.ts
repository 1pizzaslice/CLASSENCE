import mongoose, { Schema, Document, Model } from "mongoose";

export interface IReminder extends Document {
  user: mongoose.Types.ObjectId;
  lecture?: mongoose.Types.ObjectId;
  scheduledTime: Date;
  createdAt: Date;
  assignment?:mongoose.Types.ObjectId;
  reminderType:string;
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
    },
    assignment:{
      type:Schema.Types.ObjectId,
      ref:"Assignment",
    },
    reminderType:{
      type:String,
      required:true
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

ReminderSchema.pre('save', function (next) {
  if (!this.lecture && !this.assignment) {
    next(new Error('Either lecture or assignment must be provided'));
  } else {
    next();
  }
});
const Reminder: Model<IReminder> = mongoose.model<IReminder>("Reminder", ReminderSchema);

export default Reminder;