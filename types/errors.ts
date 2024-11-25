export class FileUploadError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'FileUploadError';
    }
}

export class MessageProcessError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'MessageProcessError';
    }
}