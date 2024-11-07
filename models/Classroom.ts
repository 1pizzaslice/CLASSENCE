import {Schema,model,Document} from "mongoose";

interface IClassroom extends Document{
    _id:string;
    name:string;
    code:string;
    students:string[];
    teacher:string;
    assignments:string[];
    announcements:string[];
    isDeleted:boolean;
    isCompleted:boolean;
    createdAt:Date;
    updatedAt:Date;
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
    }
},{timestamps:true});

const Classroom = model<IClassroom>('Classroom',ClassroomSchema);

export default Classroom;