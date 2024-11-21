import { Router } from "express";
import { getUserDetails,calendarPageData,assignmentPageData ,changePassword,changeName, dashboardPageData,changeIsNotificationEnabled,signOutAllDevices} from '../controllers';
import { validateRequest , changePasswordSchema } from "../middlewares";
const router = Router();

router.get('/details',getUserDetails );
router.get('/assignment',assignmentPageData );
router.get('/dashboard',dashboardPageData );
router.get('/calendar',calendarPageData );
router.post("/settings/change-password",validateRequest(changePasswordSchema), changePassword);
router.post("/settings/change-name", changeName);
router.post("/settings/change-is-notification-enabled", changeIsNotificationEnabled);
router.post("/settings/sign-out-all-devices", signOutAllDevices);

export default router

