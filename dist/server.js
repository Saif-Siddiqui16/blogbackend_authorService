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
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const author_route_js_1 = __importDefault(require("./routes/author.route.js"));
const cloudinary_1 = require("cloudinary");
const rabbitmq_js_1 = require("./utils/rabbitmq.js");
const db_js_1 = require("./utils/db.js");
dotenv_1.default.config();
cloudinary_1.v2.config({
    cloud_name: process.env.Cloud_Name,
    api_key: process.env.Cloud_Api_Key,
    api_secret: process.env.Cloud_Api_Secret,
});
const app = (0, express_1.default)();
const port = process.env.PORT || 5000;
app.use(express_1.default.json());
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
}));
(0, rabbitmq_js_1.connectRabbitMQ)();
function initDB() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield (0, db_js_1.sql) `
        CREATE TABLE IF NOT EXISTS blogs(
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description VARCHAR(255) NOT NULL,
        blogcontent TEXT NOT NULL,
        image VARCHAR(255) NOT NULL,
        category VARCHAR(255) NOT NULL,
        author VARCHAR(255) NOT NULL,
        create_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        `;
            yield (0, db_js_1.sql) `
        CREATE TABLE IF NOT EXISTS comments(
        id SERIAL PRIMARY KEY,
        comment VARCHAR(255) NOT NULL,
        userid VARCHAR(255) NOT NULL,
        username VARCHAR(255) NOT NULL,
        blogid VARCHAR(255) NOT NULL,
        create_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        `;
            yield (0, db_js_1.sql) `
        CREATE TABLE IF NOT EXISTS savedblogs(
        id SERIAL PRIMARY KEY,
        userid VARCHAR(255) NOT NULL,
        blogid VARCHAR(255) NOT NULL,
        create_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        `;
            console.log("database initialized successfully");
        }
        catch (error) {
            console.log("Error initDb", error);
        }
    });
}
app.use("/api/v1/author", author_route_js_1.default);
initDB().then(() => {
    app.listen(port, () => __awaiter(void 0, void 0, void 0, function* () {
        console.log(`server is running on : ${port}`);
    }));
});
