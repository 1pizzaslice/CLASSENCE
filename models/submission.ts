import mongoose ,{Schema,Document} from "mongoose";

export interface ISubmission extends Document{
    assignment:Schema.Types.ObjectId;
    student:Schema.Types.ObjectId;
    media:string[];
    marks:number;
    isGraded:boolean;
    createdAt:Date;
    updatedAt:Date;
    version:number;
    history:{
        media:string[];
        timestamp:Date;
    }[];
}

const SubmissionSchema = new Schema<ISubmission>({
    assignment: {
        type: Schema.Types.ObjectId,
        ref: 'Assignment',
        required: true,
    },
    student: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    media: [
        {
            type: String,
        },
    ],
    marks: {
        type: Number,
        default: 0,
    },
    isGraded: {
        type: Boolean,
        default: false,
    },
    version: {
        type: Number,
        default: 1,
    },
    history: [
        {
            media: [
                {
                    type: String,
                },
            ],
            timestamp: {
                type: Date,
                default: Date.now,
            }
        },
    ],
}, { timestamps: true });

const Submission = mongoose.model<ISubmission>('Submission',SubmissionSchema);

export default Submission;