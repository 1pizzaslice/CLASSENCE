export {loginUser,registerUser} from "./auth/auth";
export {verifyOtp, sendOtpEmail,resendOtp} from "./auth/otp";
export {requestPasswordReset,resetPassword} from "./auth/resetPassword";
export {createClass,joinClass,deleteClass,inviteStudent,removeStudent,getClassroomDetails} from "./classroom";
export {getAllReminders,createReminder,deleteReminder,updateReminder,calendarPageData,getUserDetails,assignmentPageData,changePassword, changeIsNotificationEnabled,dashboardPageData ,changeName,signOutAllDevices} from "./user";
export {createAnnouncement,editAnnouncement,deleteAnnouncement} from "./announcement";
export {createAssignment,updateAssignment,deleteAssignment,getAssignments} from "./assignment";
export {createOrUpdateSubmission , gradeSubmission} from "./submission";
export {getAllTodos,createTodo,updateTodo,deleteTodo,getTodoById} from "./todo";
export { createLecture, getLectures, deleteLecture, updateLecture , startLiveSession ,stopLiveSession , } from './lecture'