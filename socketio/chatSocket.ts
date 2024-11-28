import { Server } from 'socket.io';
import { Assignment, Chat, User } from "../models";
import { CustomSocket } from '../types';
import { IAssignment } from '../models/assignments';
import { IClassroom } from '../models/Classroom';
import { messageQueue, fileQueue } from '../queues/config';

const MAX_FILE_SIZE = 5 * 1024 * 1024; 
const ALLOWED_FILE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword'
];

interface FileData {
    buffer: Buffer;
    name: string;
    type: string;
    size: number;
}

interface ChatMessage {
    message?: string;
    file?: FileData;
    assignmentId?: string;
    studentId?: string;
    userId?: string;
}

interface ProcessedFile {
    url: string;
    name: string;
    type: string;
    size: number;
}


function validateFile(file: { size: number, type: string, name: string }, socket: CustomSocket) {
    if (file.size > MAX_FILE_SIZE) {
        console.log("ASAA")
        socket.emit('fileError', {
            type: 'SIZE_LIMIT',
            message: `File size exceeds limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
            details: {
                maxSize: MAX_FILE_SIZE,
                actualSize: file.size,
                fileName: file.name
            }
        });
        throw new Error(`File size exceeds limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }
    
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        console.log("ASKBAS")
        socket.emit('fileError', {
            type: 'INVALID_TYPE',
            message: 'Invalid file type. Allowed types: images, PDF, and Word documents',
            details: {
                allowedTypes: ALLOWED_FILE_TYPES,
                actualType: file.type,
                fileName: file.name
            }
        });
        throw new Error('Invalid file type. Allowed types: images, PDF, and Word documents');
    }
}

const processFile = async (file: FileData , socket:CustomSocket): Promise<ProcessedFile> => {
    validateFile(file,socket);
    const fileJob = await fileQueue.add({
        fileData: file.buffer,
        fileName: file.name,
        fileType: file.type,
    });
    
    const result = await fileJob.finished();
    return {
        url: result.url,
        name: file.name,
        type: file.type,
        size: file.size
    };
};

const handleChatMessage = async (
    io: Server,
    socket: CustomSocket,
    chatData: ChatMessage,
    chatType: 'assignment' | 'developer'
) => {
    const { message, file } = chatData;
    const senderId = socket.user._id;

    const room = chatType === 'assignment'
        ? getRoomName.assignment(chatData.assignmentId!)
        : getRoomName.developer(chatData.userId!);

    let fileInfo;
    console.log(file)
    if (file) {
        try {
            fileInfo = await processFile(file,socket);
        } catch (error) {
            throw new Error(error instanceof Error ? error.message : 'File processing failed');
        }
    }

    const newMessage = {
        sender: senderId,
        message,
        file: fileInfo,
        timestamp: new Date(),
        isRead: false
    };

    io.to(room).emit('chatUpdate', {
        ...newMessage,
        sender: { 
            _id: senderId, 
            name: socket.user.name 
        }
    });
    // console.log(chatType)
    await messageQueue.add({
        message: newMessage,
        ...(chatType === 'assignment' 
            ? {
                assignmentId: chatData.assignmentId,
            } 
            : {
                userId: chatData.userId
            }),
        senderId,
        chatType
    });
};

const getRoomName = {
    assignment: (assignmentId: string) => `assignment_${assignmentId}`,
    developer: (userId: string) => `developer_${userId}`
};
const authorizeUser = async (userId: string, assignmentId: string) => {
    const assignment = await Assignment.findById(assignmentId).populate('classroom')as unknown as IAssignment & { classroom: IClassroom };
    if (!assignment) return { authorized: false, error: 'Assignment not found' };

    const classroom = assignment.classroom;
    if (!classroom) return { authorized: false, error: 'Classroom not found' };
    // console.log(classroom)
    // console.log(userId)

    const isTeacher = classroom.teacher.toString() === userId.toString();
    const isStudent = classroom.students.some((student: string) => student.toString() === userId.toString());
    // console.log(isTeacher)
    // console.log(isStudent)

    if (!(isTeacher && !isStudent)) return { authorized: false, error: 'You are not authorized to join this chat' };

    return { authorized: true, isTeacher, classroom, assignment };
};


export const chatSocket = (io: Server) => {
    io.on('connection', (socket) => {
        const customSocket = socket as CustomSocket;
        console.log(`User connected: ${socket.id}`);

        socket.on('joinAssignmentChat', async (data) => {
            try {
                const { assignmentId  } = data;
                const userId = customSocket.user._id;

                if (!assignmentId ) {
                    return socket.emit('error', 'Assignment ID are required.');
                }

                if (assignmentId.length !== 24) {
                    return socket.emit('error', 'Invalid assignment ID.');
                }

                const { authorized, error,isTeacher } = await authorizeUser(userId, assignmentId);
                if (!authorized) return socket.emit('error', error);

                const room = getRoomName.assignment(assignmentId);
                socket.join(room);

                let chat= await Chat.find(
                    {
                        assignmentId,
                        chatType:"assignment"
                    }
                ).populate({
                    path:"participants",
                    select:"name"
                }).populate({
                    path:"messages.sender",
                    select:"name"
                })
                //  console.log(chat)
                socket.emit('chatHistory', chat);
                socket.emit('success', `Joined chat for assignment: ${assignmentId}`);
            } catch (err) {
                console.error('Error joining assignment chat:', err);
                socket.emit('error', 'An error occurred while joining the chat.');
            }
        });

        socket.on('assignmentChatMessage', async (chatData) => {
            try {
                const { assignmentId, message, file } = chatData;
                
                if (!assignmentId || (!message && !file)) {
                    return socket.emit('error', 'Invalid chat data');
                }

                await handleChatMessage(io, customSocket, chatData, 'assignment');
            } catch (err) {
                console.error('Error in assignment chat:', err);
                socket.emit('error', err instanceof Error ? err.message : 'An error occurred');
            }
        });
        socket.on('getDevChats', async (data) => {
            try {
                const myId = customSocket.user._id;
                const user = await User.findById(myId).select("isAdmin");
                if(!user || !user.isAdmin) {
                    return socket.emit('notAdmin', 'User is not an admin');
                }
                const chats = await Chat.find({chatType:"developer"}).populate({
                    path:"messages.sender",
                    select:"name"
                }).populate({
                    path:"participants",
                    select:"name"
                });
                socket.emit('devChats', chats);
                socket.emit("success","Developer chats fetched successfully")
            } catch (err) {
                console.error('Error getting developer chats:', err);
                socket.emit('notAdmin', 'An error occurred while getting developer chats');
            }
        });
        socket.on('joinDeveloperChat', async (data) => {
            try {
                const {userId} = data; 
                const myId = customSocket.user._id;
                const room = `developer_${userId}`;
                socket.join(room);
                const user = await User.findOne({_id:myId}).select("name isAdmin");
                // console.log(user)
                // console.log(myId,userId)
                if(!user || (!user.isAdmin && myId.toString() !== userId.toString())) {
                    return socket.emit('error', 'User is not an admin');
                }
                const chat =await Chat.find(
                    {
                        userId,
                        chatType:"developer"
                    }
                ).populate({
                    path:"messages.sender",
                    select:"name"
                }).populate({
                    path:"participants",
                    select:"name"
                })

                socket.emit('chatHistory', chat);
                socket.emit('success', `Joined chat for developer: ${room}`);
            } catch (err) {
                console.error('Error joining developer chat:', err);
                socket.emit('error', 'An error occurred while joining the chat.');
            }
        });

        socket.on('developerChatMessage', async (chatData) => {
            try {
                const { message, file, userId } = chatData;
                
                if (!userId || (!message && !file)) {
                    return socket.emit('error', 'Invalid chat data');
                }

                await handleChatMessage(io, customSocket, chatData, 'developer');
            } catch (err) {
                console.error('Error in developer chat:', err);
                socket.emit('error', err instanceof Error ? err.message : 'An error occurred');
            }
        });

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.id}`);
        });
    });
};
