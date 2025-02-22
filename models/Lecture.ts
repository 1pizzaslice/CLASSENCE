import { Document, Schema, model } from "mongoose";

export enum LectureStatus {
  Scheduled = "Scheduled",
  InProgress = "InProgress",
  Completed = "Completed",
}

export enum AttendanceStatus {
  Present = "Present",
  Absent = "Absent",
}

export interface ILecture extends Document {
  title: string;
  description: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  status: LectureStatus;
  classroom: Schema.Types.ObjectId;
  teacher: Schema.Types.ObjectId;
  youtubeLiveStreamURL?: string;
  attendance: {
    student: Schema.Types.ObjectId;
    status: AttendanceStatus;
  }[];
  statusTimestamps?: {
    scheduledAt: Date;
    startedAt?: Date;
    completedAt?: Date;
  };
  createdAt: Date;
}

const AttendanceSchema = new Schema(
  {
    student: { 
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true 
    },
    status: {
      type: String,
      enum: Object.values(AttendanceStatus),
      default: AttendanceStatus.Absent,
    }
  },
  { _id: false }
);

const LectureSchema = new Schema(
  {
    title: { 
      type: String, 
      required: true, 
      trim: true 
    },
    description: { 
      type: String, 
      required: true, 
      trim: true 
    },
    startTime: { 
      type: Date, 
      required: true 
    },
    endTime: {
      type: Date,
      default: null,
      validate: {
        validator: function (this: ILecture, value: Date) {
          return !value || value > this.startTime;
        },
        message: "End time must be greater than start time.",
      },
    },
    status: {
      type: String,
      enum: {
        values: Object.values(LectureStatus),
        message: `{VALUE} is not a valid lecture status`,
      },
      default: LectureStatus.Scheduled,
    },
    classroom: { 
      type: Schema.Types.ObjectId, 
      ref: "Classroom", 
      required: true 
    },
    teacher: { 
      type: Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    youtubeLiveStreamURL:{
      type:String,
      default:null
    },
    attendance: [AttendanceSchema],
    statusTimestamps: {
      scheduledAt: { type: Date, default: Date.now },
      startedAt: { type: Date, default: null },
      completedAt: { type: Date, default: null },
    },
  },
  { timestamps: true, versionKey: false }
);

LectureSchema.index({ classroom: 1, startTime: 1 }); //add index for better performance
LectureSchema.index({ teacher: 1 });
LectureSchema.index({ status: 1 });
AttendanceSchema.index({ student: 1, status: 1 });


const Lecture = model<ILecture>("Lecture", LectureSchema);
export default Lecture;
