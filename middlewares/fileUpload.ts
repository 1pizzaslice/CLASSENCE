import multer from 'multer';
import { Request, Response, NextFunction } from 'express';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');  // the file upload destination
  },
  //TODO:fix if uploads folder is not present
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

// file filter to restrict allowed file types
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type. Allowed types: JPEG, PNG, PDF.'));
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // set file size limit to 5 MB
});

export const fileUploadMiddleware = upload.array('media', 10); //  max files allowed

export default fileUploadMiddleware;
