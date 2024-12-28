"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("../queues/config");
const errors_1 = require("../types/errors");
const messageProcessor_1 = require("../utility/messageProcessor");
config_1.fileQueue.on('error', (error) => {
    console.error('File Queue Error:', error);
});
config_1.fileQueue.on('failed', (job, error) => {
    console.error(`File Job ${job.id} failed:`, error);
});
config_1.messageQueue.on('error', (error) => {
    console.error('Message Queue Error:', error);
});
config_1.messageQueue.on('failed', (job, error) => {
    console.error(`Message Job ${job.id} failed:`, error);
});
config_1.fileQueue.process(async (job) => {
    const maxRetries = 3;
    let attempt = 0;
    while (attempt < maxRetries) {
        try {
            // console.log('Processing file upload:', job.data);
            const result = await (0, messageProcessor_1.processFileUpload)(job.data);
            return result;
        }
        catch (error) {
            const err = error;
            attempt++;
            if (attempt === maxRetries) {
                throw new errors_1.FileUploadError(`Failed after ${maxRetries} attempts: ${err.message}`);
            }
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
});
config_1.messageQueue.process(async (job) => {
    const maxRetries = 3;
    let attempt = 0;
    while (attempt < maxRetries) {
        try {
            const result = await (0, messageProcessor_1.processMessage)(job.data);
            return result;
        }
        catch (error) {
            const err = error;
            attempt++;
            if (attempt === maxRetries) {
                throw new errors_1.MessageProcessError(`Failed after ${maxRetries} attempts: ${err.message}`);
            }
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
});
