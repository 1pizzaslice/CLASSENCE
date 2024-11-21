import express from 'express';
import { createLecture, getLectures, updateLecture, deleteLecture } from '../controllers';

const router = express.Router();

router.post('/', createLecture);
router.get('/', getLectures);
router.put('/', updateLecture);
router.delete('/', deleteLecture);

export default router;
