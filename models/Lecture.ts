import { Document, Schema, model } from "mongoose";

export enum LectureStatus {
  Scheduled = "Scheduled",
  InProgress = "In Progress",
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
  recordingsURL: string;
  attendance: {
    student: Schema.Types.ObjectId;
    joinedDuration: number;
    status: AttendanceStatus;
  }[];
}

const AttendanceSchema = new Schema(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    joinedDuration: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: Object.values(AttendanceStatus),
      default: AttendanceStatus.Absent,
    },
  },
  { _id: false }
);

const LectureSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: Object.values(LectureStatus),
      default: LectureStatus.Scheduled,
    },
    classroom: {
      type: Schema.Types.ObjectId,
      ref: 'Classroom',
      required: true,
    },
    teacher: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recordingsURL: {
      type: String,
      default: ''
    },
    attendance: [AttendanceSchema],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Lecture = model<ILecture>('Lecture', LectureSchema);
export default Lecture;
