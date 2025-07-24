"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const isAuth_js_1 = require("../middlewares/isAuth.js");
const multer_js_1 = __importDefault(require("../middlewares/multer.js"));
const author_controller_js_1 = require("../controllers/author.controller.js");
const router = express_1.default.Router();
router.post("/blog/new", isAuth_js_1.isAuth, multer_js_1.default, author_controller_js_1.createBlog);
router.post("/blog/:id", isAuth_js_1.isAuth, multer_js_1.default, author_controller_js_1.updateBlog);
router.delete("/blog/:id", isAuth_js_1.isAuth, author_controller_js_1.deleteBlog);
router.post("/ai/title", author_controller_js_1.aiTitleResponse);
router.post("/ai/descripiton", author_controller_js_1.aiDescriptionResponse);
router.post("/ai/blog", author_controller_js_1.aiBlogResponse);
exports.default = router;
