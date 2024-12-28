"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const controllers_1 = require("../controllers");
const socket_io_1 = require("socket.io");
const Lecture_1 = require("../controllers/lecture/Lecture");
const router = express_1.default.Router();
const io = new socket_io_1.Server();
router.post("/create", controllers_1.createLecture);
router.get("/", controllers_1.getLectures);
router.delete("/delete", controllers_1.deleteLecture);
router.patch("/update", controllers_1.updateLecture);
router.post("/mark", Lecture_1.markAttendance);
router.post("/start-live-session", async (req, res, next) => {
    const { lectureId } = req.body;
    try {
        const roomName = await (0, controllers_1.startLiveSession)({ req, res, next, lectureId, socketServer: io });
        res.status(200).json({ success: true, roomName });
    }
    catch (error) {
        next(error);
    }
});
router.post("/stop-live-session", async (req, res, next) => {
    const { lectureId } = req.body;
    try {
        await (0, controllers_1.stopLiveSession)(req, res, next, lectureId, io);
        res.status(200).json({ success: true });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
