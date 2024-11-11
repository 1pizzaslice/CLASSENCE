import { Document, Types , Schema , model } from 'mongoose';

export interface ISubmission {
    student_id: Types.ObjectId;
    media?: string;
    version: number;
    history: string[];
    isGraded: boolean;
    grade?: string;
}

export interface IAssignment extends Document {
    name: string;
    description: string;
    media?: string;
    dueDate: Date;
    submissions: ISubmission[];
    createdAt: Date;
    updatedAt: Date;
}

const submissionSchema = new Schema<ISubmission>({
    student_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true 
    },
    media: {
        type: String 
    },
    version: { 
        type: Number, 
        default: 1 
    },
    history: { 
        type: [String], 
        default: [] 
    },
    isGraded: { 
        type: Boolean, 
        default: false 
    },
    grade: { 
        type: String 
    },
}, { 
    timestamps: true,
    _id: false 
});

const assignmentSchema = new Schema<IAssignment>({
    name: { 
        type: String, 
        required: true 
    },
    description: { 
        type: String, 
        required: true 
    },
    media: { 
        type: String 
    },
    dueDate: { 
        type: Date, 
        required: true 
    },
    submissions: { 
        type: [submissionSchema], 
        default: [] 
    },
}, { timestamps: true });

export const Assignment = model<IAssignment>('Assignment', assignmentSchema);
