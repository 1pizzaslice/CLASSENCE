import { Document, Schema, model } from "mongoose";

export interface ITodo extends Document {
  title: string;
  description?: string;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  user: Schema.Types.ObjectId;
}

const TodoSchema = new Schema<ITodo>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    isCompleted: { type: Boolean, default: false },
    user: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

const Todo = model<ITodo>("Todo", TodoSchema);

export default Todo;