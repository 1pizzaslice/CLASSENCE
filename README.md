# Classence Backend

This repository contains the backend services for the **Classence** platform, which facilitates seamless communication and collaboration between students, teachers, and developers. It handles real-time interactions, user authentication, and data storage.

---

## Features

- **Real-time Communication**: WebSockets for live chat, assignments, and live lectures.
- **Secure Authentication**: Token-based authentication for all APIs.
- **Encrypted Data**: Ensures the safety of message data.
- **MongoDB Integration**: Persistent storage for assignment-related chats.
- **Optimized Structure**: Modularized code for scalability and maintenance.

---

## Quick Start

1. Clone the repository:
   ```bash
   git clone https://github.com/1pizzaslice/CLASSENCE-BACKEND.git
   cd CLASSENCE-BACKEND
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with the following variables:
   ```
    JWT_LIFETIME=3600
    MONGO_URI=mongodb://localhost:27017/classence?retryWrites=true&w=majority
    EMAIL_USER=your-email@example.com
    EMAIL_PASS=your-email-password
    FRONTEND_URL=https://classence.me
    CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
    CLOUDINARY_API_KEY=your-cloudinary-api-key
    CLOUDINARY_API_SECRET=your-cloudinary-api-secret
    AWS_ACCESS_KEY_ID=your-aws-access-key-id
    AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
    AWS_REGION=your-aws-region
    AWS_S3_BUCKET_NAME=your-s3-bucket-name
    REDIS_URL=redis://localhost:6379
    YOUTUBE_CLIENT_ID=your-youtube-client-id
   ```

4. Start the server:
   ```bash
   npm run dev
   ```

5. Access the API at:
   ```
   http://localhost:5000
   ```

---

## API Documentation

Access the Postman Collection for testing the APIs:

[![Postman Collection](https://img.shields.io/badge/Postman-Collection-orange?logo=postman)](https://www.postman.com/classence/classence/collection/tgiqb82/classence-copy-2)

---

## Frontend Repository

The frontend for the Classence platform can be found at the following link:

[![Frontend Repository](https://img.shields.io/badge/Repository-Frontend-blue?logo=github)](https://github.com/Shreyanshu005/Classence-Frontened)

---

## Hosted Frontend

The live version of the frontend is available here:

[![Hosted Frontend](https://img.shields.io/badge/Live-Frontend-green?logo=vercel)](https://classence.me)

---

## Folder Structure

```
classence-backend/
├── controllers/         # Handles request/response logic
├── models/              # MongoDB models
├── routes/              # API route definitions
├── middlewares/         # Custom middleware functions
├── utils/               # Helper functions
├── socket/              # WebSocket logic
├── config/              # Environment and database configuration
├── tests/               # Unit and integration tests
└── index.ts             # Entry point of the application
```
