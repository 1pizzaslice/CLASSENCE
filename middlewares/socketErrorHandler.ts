import { Socket } from 'socket.io';
import fs from 'fs';
import path from 'path';
import { CustomError } from '../types';

const socketErrorHandler = (socket: Socket, next: Function) => {
    try {
        next();
    } catch (error ) {
        const err = error as CustomError;
        const statusCode = err.statusCode || 500;
        const message = err.message || 'Internal Server Error';
        const errorMsg = err.error || message;

        const log = `${statusCode} ${errorMsg} ${new Date().toISOString()} ${socket.handshake.address} ${socket.nsp.name} ${socket.id}\n`;

        const logsDir = path.join(__dirname, '../logs');
        const logFilePath = path.join(logsDir, 'socket_errors.txt');

        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }

        if (!fs.existsSync(logFilePath)) {
            fs.writeFileSync(logFilePath, "");
        }

        fs.appendFile(logFilePath, log, (err) => {
            if (err) {
                console.log(err);
            }
        });

        socket.emit('error', message);
    }
};

export default socketErrorHandler;

