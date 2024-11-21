import { Router } from "express";
const router = Router();
import {getAllTodos,createTodo,updateTodo,deleteTodo,getTodoById } from '../controllers/';

router.get('/', getAllTodos);
router.get('/:id', getTodoById);
router.post('/create', createTodo);
router.put('/update/:id', updateTodo);
router.post('/delete/:id', deleteTodo)

export default router;