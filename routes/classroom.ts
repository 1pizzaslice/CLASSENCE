import { Router } from "express";
const router = Router();
import { createClass,joinClass,deleteClass,inviteStudent,removeStudent} from '../controllers/';

router.post('/create', createClass);
router.post('/join', joinClass);
router.delete('/delete', deleteClass);
router.post('/invite', inviteStudent);
router.delete('/remove', removeStudent);


export default router;