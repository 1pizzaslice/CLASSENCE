"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const http_1 = __importDefault(require("http"));
const config_1 = require("./config");
const routes_1 = require("./routes/");
const connect_1 = __importDefault(require("./db/connect"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const middlewares_1 = require("./middlewares");
const types_1 = require("./types");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
require("./services/jobScheduler");
const socket_io_1 = require("socket.io");
const path_1 = __importDefault(require("path"));
const socketio_1 = require("./socketio");
require("./workers/chatWorker");
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const io1 = new socket_io_1.Server(server, {
    maxHttpBufferSize: 1e8,
    cors: {
        origin: '*',
    },
});
const PORT = Number(process.env.PORT) || 5000;
const SOCKET_PORT = Number(process.env.SOCKET_PORT) || 5001;
app.set('trust proxy', 1); // to resolve nginx proxy issue
app.use(express_1.default.static(path_1.default.join(__dirname, 'public')));
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 min 
    max: 10000, // max 100 req per ip //TODO:CHANGE MAX REQ TO 100 AFTER DEVELOPMENT
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
});
io1.use(middlewares_1.socketErrorHandler);
io1.use(middlewares_1.authenticateSocket);
(0, socketio_1.chatSocket)(io1);
(0, socketio_1.liveChatSocket)(io1);
(0, config_1.configureWebrtc)(io1);
(0, config_1.configureSocket)(io1);
app.use(express_1.default.static('public'));
app.use(limiter);
app.use(limiter);
app.use(middlewares_1.logRequest);
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use('/api/auth', routes_1.authRoute);
app.use('/api/user', middlewares_1.verify, routes_1.userRoute);
app.use("/api/classroom", middlewares_1.verify, routes_1.classroomRoute);
app.use("/api/announcement", middlewares_1.verify, routes_1.announcementRoute);
app.use("/api/assignment", middlewares_1.verify, routes_1.assignmentRoute);
app.use("/api/submission", middlewares_1.verify, routes_1.submissionRoute);
app.use("/api/todo", middlewares_1.verify, routes_1.todoRoute);
app.use("/api/lecture", middlewares_1.verify, routes_1.lectureRoute);
app.use("/api/reminder", middlewares_1.verify, routes_1.reminderRoute);
app.use(express_1.default.static(path_1.default.join(__dirname, 'public')));
// app.use("/lectures", lectureRoute);
app.use('*', (req, res, next) => {
    const error = new types_1.CustomError('Resource not found!!!!', 404);
    next(error);
});
app.use(middlewares_1.errorHandler);
(0, connect_1.default)().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is listening on PORT ${PORT}`);
    });
    server.listen(SOCKET_PORT, () => {
        console.log(`Server is running on port ${SOCKET_PORT}`);
    });
});
