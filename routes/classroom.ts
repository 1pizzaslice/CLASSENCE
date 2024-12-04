import { Router } from "express";
const router = Router();
import { createClass,joinClass,deleteClass,inviteStudent,removeStudent,getClassroomDetails, attendanceData} from '../controllers/';

router.post('/create', createClass);
router.post('/join', joinClass);
router.post('/delete', deleteClass);
router.post('/invite', inviteStudent);
router.post('/remove', removeStudent);
router.get('/details', getClassroomDetails);
router.get("/attendance",attendanceData)

export default router;