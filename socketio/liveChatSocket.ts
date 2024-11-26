// socketio/liveChatSocket.ts
import { Server } from 'socket.io';
import Redis from 'ioredis';
import { CustomSocket } from '../types';
import { Lecture, User } from '../models';

if (!process.env.REDIS_URL) {
    throw new Error('REDIS_URL is not defined');
}
const redis = new Redis(process.env.REDIS_URL);

const CHAT_EXPIRY = 12 * 60 * 60;

export const liveChatSocket = (io: Server) => {
    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.id}`);
        const customSocket = socket as CustomSocket;
    
        // const debugRoom = (room: string) => {
        //     const sockets = io.sockets.adapter.rooms.get(room);
        //     console.log(`Room ${room} has ${sockets?.size || 0} sockets`);
        //     console.log('Socket rooms:', Array.from(socket.rooms));
        // };

        socket.on('joinLectureChat', async (data) => {
            try {
                const { lectureId } = data;
                const userId = customSocket.user._id;
                const [user , lecture] = await Promise.all([User.findById(userId),Lecture.findById(lectureId)]);
                if(!user || !lecture || !user.classRooms.includes(lecture.classroom.toString())){
                    return socket.emit('error', 'You are not authorized to join this chat');
                }
                const room = `lecture_${lectureId}`;
                socket.join(room);
  
                const messages = await redis.lrange(`chat:${lectureId}`, 0, -1);
                const parsedMessages = messages.map(m => JSON.parse(m));
                
                socket.emit('chatHistory', parsedMessages);
            } catch (err) {
                socket.emit('error', 'Failed to join lecture chat');
            }
        });

        socket.on('lectureChatMessage', async (data) => {
            try {
                const { message, lectureId } = data;
                const room = `lecture_${lectureId}`;
                if(socket.rooms.has(room) === false){
                    return socket.emit('error', 'You are not authorized to send message');
                }
                
                const newMessage = {
                    sender: {
                        _id: customSocket.user._id,
                        name: customSocket.user.name
                    },
                    message,
                    timestamp: new Date()
                };

                await redis.multi()
                    .rpush(`chat:${lectureId}`, JSON.stringify(newMessage))
                    .expire(`chat:${lectureId}`, CHAT_EXPIRY)
                    .exec();

                io.to(room).emit('chatUpdate', newMessage);
            } catch (err) {
                socket.emit('error', 'Failed to send message');
            }
        });

        socket.on('endLectureChat', async (data) => {
            try {
                const { lectureId } = data;
                const userId = customSocket.user._id;
                const lecture = await Lecture.findById(lectureId);
                if (!lecture || lecture.teacher.toString() !== userId.toString()) {
                    return socket.emit('error', 'You are not the owner of this lecture');
                }
                const room = `lecture_${lectureId}`;

                // debugRoom(room);

    
                await redis.del(`chat:${lectureId}`);
                const sockets = await io.in(room).fetchSockets();
                console.log(`Found ${sockets.length} sockets in room`);


                sockets.forEach((socket) => {
                    socket.emit('chatEnded', {
                        message: "Lecture has ended",
                        lectureId
                    });
                });

                sockets.forEach((socket) => socket.leave(room));

                socket.emit('chatEndedConfirm', { success: true });
                console.log('Chat ended event emitted');

            } catch (err) {
                socket.emit('error', 'Failed to end chat');
            }
        });
    });
};