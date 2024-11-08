import {Schema,model,Document,Types} from "mongoose";
export interface IClassroom extends Document{
    _id:string;
    name:string;
    code:string;
    students:string[];
    teacher:Types.ObjectId;
    assignments:string[];
    announcements:string[];
    isDeleted:boolean;
    isCompleted:boolean;
    createdAt:Date;
    updatedAt:Date;
    invitedStudents:string[];
}

const ClassroomSchema = new Schema({
    name:{
        type:String,
        required:true
    },
    code:{
        type:String,
        required:true,
        unique:true
    },
    students:[{
        type:Schema.Types.ObjectId,
        ref:'User'
    }],
    teacher:{
        type:Schema.Types.ObjectId,
        ref:'User'
    },
    assignments:[{
        type:Schema.Types.ObjectId,
        ref:'Assignment'
    }],
    announcements:[{
        type:Schema.Types.ObjectId,
        ref:'Announcement'
    }],
    isDeleted:{
        type:Boolean,
        default:false
    },
    isCompleted:{
        type:Boolean,
        default:false
    },
    invitedStudents:[{
        type:Schema.Types.ObjectId,
    }]
},{timestamps:true});

const Classroom = model<IClassroom>('Classroom',ClassroomSchema);

export default Classroom;