import express from "express";
import {createReminder,updateReminder,deleteReminder,getAllReminders} from "../controllers";

const router = express.Router();

router.post("/", createReminder);
router.put("/:reminderId", updateReminder);
router.delete("/:reminderId", deleteReminder);
router.get("/", getAllReminders);

export default router;
