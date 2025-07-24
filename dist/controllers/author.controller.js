"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiBlogResponse = exports.aiDescriptionResponse = exports.aiTitleResponse = exports.deleteBlog = exports.updateBlog = exports.createBlog = void 0;
const dataUri_js_1 = __importDefault(require("../utils/dataUri.js"));
const db_js_1 = require("../utils/db.js");
const rabbitmq_js_1 = require("../utils/rabbitmq.js");
const cloudinary_1 = require("cloudinary");
const TryCatch_1 = __importDefault(require("../utils/TryCatch"));
const genai_1 = require("@google/genai");
exports.createBlog = (0, TryCatch_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { title, description, blogcontent, category } = req.body;
    const file = req.file;
    if (!file) {
        res.status(400).json({
            message: "No file to upload",
        });
        return;
    }
    const fileBuffer = (0, dataUri_js_1.default)(file);
    if (!fileBuffer || !fileBuffer.content) {
        res.status(400).json({
            message: "Failed to generate buffer",
        });
        return;
    }
    const cloud = yield cloudinary_1.v2.uploader.upload(fileBuffer.content, {
        folder: "blogs",
    });
    const result = yield (0, db_js_1.sql) `INSERT INTO blogs (title, description, image, blogcontent,category, author) VALUES (${title}, ${description},${cloud.secure_url},${blogcontent},${category},${(_a = req.user) === null || _a === void 0 ? void 0 : _a._id}) RETURNING *`;
    yield (0, rabbitmq_js_1.invalidateChacheJob)(["blogs:*"]);
    return res.json({
        message: "Blog Created",
        blog: result[0],
    });
}));
exports.updateBlog = (0, TryCatch_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id } = req.params;
    const { title, description, blogcontent, category } = req.body;
    const file = req.file;
    const blog = yield (0, db_js_1.sql) `SELECT * FROM blogs WHERE id=${id}`;
    if (!blog.length) {
        res.status(404).json({
            message: "No blog with this id",
        });
        return;
    }
    if (blog[0].author != ((_a = req.user) === null || _a === void 0 ? void 0 : _a._id)) {
        res.status(401).json({
            message: "You are not author of this blog",
        });
        return;
    }
    let imageUrl = blog[0].image;
    if (file) {
        const fileBuffer = (0, dataUri_js_1.default)(file);
        if (!fileBuffer || !fileBuffer.content) {
            res.status(400).json({
                message: "Failed to generate buffer",
            });
            return;
        }
        const cloud = yield cloudinary_1.v2.uploader.upload(fileBuffer.content, {
            folder: "blogs",
        });
        imageUrl = cloud.secure_url;
    }
    const updatedBlog = yield (0, db_js_1.sql) `UPDATE blogs SET
  title=${title || blog[0].title},
  description = ${description || blog[0].description},
  image= ${imageUrl},
  blogcontent = ${blogcontent || blog[0].blogcontent},
  category = ${category || blog[0].category}

  WHERE id = ${id}
  RETURNING *
  
  `;
    yield (0, rabbitmq_js_1.invalidateChacheJob)(["blogs:*", `blog:${id}`]);
    return res.json({
        message: "Blog Updated",
        blog: updatedBlog[0],
    });
}));
exports.deleteBlog = (0, TryCatch_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const blog = yield (0, db_js_1.sql) `SELECT * FROM blogs WHERE id = ${req.params.id}`;
    if (!blog.length) {
        res.status(404).json({
            message: "No blog with this id",
        });
        return;
    }
    if (blog[0].author !== ((_a = req.user) === null || _a === void 0 ? void 0 : _a._id)) {
        res.status(401).json({
            message: "You are not author of this blog",
        });
        return;
    }
    yield (0, db_js_1.sql) `DELETE FROM savedblogs WHERE blogid = ${req.params.id}`;
    yield (0, db_js_1.sql) `DELETE FROM comments WHERE blogid = ${req.params.id}`;
    yield (0, db_js_1.sql) `DELETE FROM blogs WHERE id = ${req.params.id}`;
    yield (0, rabbitmq_js_1.invalidateChacheJob)(["blogs:*", `blog:${req.params.id}`]);
    res.json({
        message: "Blog Delete",
    });
}));
exports.aiTitleResponse = (0, TryCatch_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { topic } = req.body;
    if (!topic)
        return res.status(400).json({ error: "Topic is required" });
    const prompt = `Suggest an engaging blog post title about: "${topic}"`;
    const ai = new genai_1.GoogleGenAI({
        apiKey: process.env.Gemini_Api_Key,
    });
    const response = yield ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
    });
    const rawtext = response.text;
    if (!rawtext) {
        return res.status(500).json({ error: "AI response is empty" });
    }
    const result = rawtext
        .replace(/\*\*/g, "")
        .replace(/[\r\n]+/g, " ")
        .replace(/[*_`~]/g, "")
        .trim();
    res.status(200).json({ result });
}));
// 2. Generate Blog Description
exports.aiDescriptionResponse = (0, TryCatch_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { title } = req.body;
    if (!title)
        return res.status(400).json({ error: "Title is required" });
    const prompt = `Write a 2-3 sentence blog description for the blog title: "${title}"`;
    const ai = new genai_1.GoogleGenAI({
        apiKey: process.env.Gemini_Api_Key,
    });
    const response = yield ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
    });
    const rawtext = response.text;
    if (!rawtext) {
        return res.status(500).json({ error: "AI response is empty" });
    }
    const result = rawtext
        .replace(/\*\*/g, "")
        .replace(/[\r\n]+/g, " ")
        .replace(/[*_`~]/g, "")
        .trim();
    res.status(200).json({ result });
}));
// 3. Generate Full Blog Content
exports.aiBlogResponse = (0, TryCatch_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { blog } = req.body;
    if (!blog) {
        return res.status(400).json({ error: "Blog input is required" });
    }
    const prompt = `
You're a professional editor. The following blog content may contain grammar issues or poor structure.

Your task:
1. Correct grammar and spelling mistakes.
2. Improve clarity and sentence flow.
3. Do not add any new ideas.
4. Preserve the original meaning.
5. Return the cleaned blog in Markdown format.

Blog content:
""" 
${blog} 
"""
`;
    const ai = new genai_1.GoogleGenAI({
        apiKey: process.env.Gemini_Api_Key,
    });
    const response = yield ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
    });
    const rawtext = response.text;
    if (!rawtext) {
        return res.status(500).json({ error: "AI response is empty" });
    }
    const result = rawtext
        .replace(/\*\*/g, "")
        .replace(/[\r\n]+/g, " ")
        .replace(/[*_`~]/g, "")
        .trim();
    res.status(200).json({ result });
}));
