"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const controllers_1 = require("../controllers");
const router = express_1.default.Router();
router.post("/", controllers_1.createReminder);
router.put("/:reminderId", controllers_1.updateReminder);
router.delete("/:reminderId", controllers_1.deleteReminder);
router.get("/", controllers_1.getAllReminders);
exports.default = router;
