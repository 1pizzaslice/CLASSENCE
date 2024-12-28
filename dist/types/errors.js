"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageProcessError = exports.FileUploadError = void 0;
class FileUploadError extends Error {
    constructor(message) {
        super(message);
        this.name = 'FileUploadError';
    }
}
exports.FileUploadError = FileUploadError;
class MessageProcessError extends Error {
    constructor(message) {
        super(message);
        this.name = 'MessageProcessError';
    }
}
exports.MessageProcessError = MessageProcessError;
