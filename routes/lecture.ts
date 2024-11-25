import express from "express";
import { 
    createLecture, 
    getLectures, 
    deleteLecture, 
    updateLecture, 
    startLecture, 
    endLecture ,
    startLiveSession,
    stopLiveSession,
} from "../controllers";
import { Server } from "socket.io";

const router = express.Router();
const io = new Server();

router.post("/create", createLecture);

router.get("/", getLectures);

router.delete("/delete", deleteLecture);

router.patch("/update", updateLecture);

router.post("/start", startLecture);

router.post("/end", endLecture);

router.post("/start-live-session", async (req, res, next) => {
    const { lectureId } = req.body;
    try {
      const roomName = await startLiveSession({ lectureId, socketServer: io });
      res.status(200).json({ success: true, roomName });
    } catch (error) {
      next(error);
    }
  });
  
  router.post("/stop-live-session", async (req, res, next) => {
    const { lectureId } = req.body;
    try {
      await stopLiveSession(lectureId, io);
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  });

export default router;
