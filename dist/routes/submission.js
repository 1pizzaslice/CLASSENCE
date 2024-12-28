"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
const controllers_1 = require("../controllers");
const middlewares_1 = require("../middlewares");
router.post('/create', middlewares_1.fileUploadMiddleware, controllers_1.createOrUpdateSubmission);
router.post('/grade', controllers_1.gradeSubmission);
exports.default = router;
