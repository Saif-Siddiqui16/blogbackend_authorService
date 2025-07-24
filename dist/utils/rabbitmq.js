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
exports.invalidateChacheJob = exports.publishToQueue = exports.connectRabbitMQ = void 0;
const amqplib_1 = __importDefault(require("amqplib"));
let channel;
const connectRabbitMQ = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const url = process.env.RABBITMQ_URL;
        console.log("Connecting to RabbitMQ URL:", process.env.RABBITMQ_URL);
        if (!url) {
            console.error("❌ RABBITMQ_URL not defined in .env");
            return;
        }
        const connection = yield amqplib_1.default.connect(url);
        channel = yield connection.createChannel();
        console.log("✅ Connected to Rabbitmq");
    }
    catch (error) {
        console.error("❌ Failed to connect to Rabbitmq", error);
    }
});
exports.connectRabbitMQ = connectRabbitMQ;
const publishToQueue = (queueName, message) => __awaiter(void 0, void 0, void 0, function* () {
    if (!channel) {
        console.error("Rabbitmq channel is not intialized");
        return;
    }
    yield channel.assertQueue(queueName, { durable: true });
    channel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)), {
        persistent: true,
    });
});
exports.publishToQueue = publishToQueue;
const invalidateChacheJob = (cacheKey) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const message = {
            action: "invalidateCache",
            keys: cacheKey,
        };
        yield (0, exports.publishToQueue)("cache-invalidation", message);
        console.log("✅ Cache invalidation job published to Rabbitmq");
    }
    catch (error) {
        console.error("❌ Failed to Publish cache on Rabbitmq", error);
    }
});
exports.invalidateChacheJob = invalidateChacheJob;
