
import { fileQueue, messageQueue } from '../queues/config';
import { FileUploadError, MessageProcessError } from '../types/errors';
import { processFileUpload, processMessage } from '../utility/messageProcessor';

fileQueue.on('error', (error) => {
    console.error('File Queue Error:', error);
});

fileQueue.on('failed', (job, error) => {
    console.error(`File Job ${job.id} failed:`, error);
});

messageQueue.on('error', (error) => {
    console.error('Message Queue Error:', error);
});

messageQueue.on('failed', (job, error) => {
    console.error(`Message Job ${job.id} failed:`, error);
});

fileQueue.process(async (job) => {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
        try {
            // console.log('Processing file upload:', job.data);
            const result = await processFileUpload(job.data);
            return result;
        } catch (error) {
            const err = error as Error;
            attempt++;
            if (attempt === maxRetries) {
                throw new FileUploadError(`Failed after ${maxRetries} attempts: ${err.message}`);
            }
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
});

messageQueue.process(async (job) => {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
        try {
            const result = await processMessage(job.data);
            return result;
        } catch (error) {
            const err  = error as Error;
            attempt++;
            if (attempt === maxRetries) {
                throw new MessageProcessError(`Failed after ${maxRetries} attempts: ${err.message}`);
            }
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
});