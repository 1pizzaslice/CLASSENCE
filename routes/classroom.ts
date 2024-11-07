import { Router } from "express";
const router = Router();
import { createClass} from '../controllers/';

router.post('/create', createClass);


export default router;