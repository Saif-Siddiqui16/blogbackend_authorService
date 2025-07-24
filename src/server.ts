import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import authorRoute from "./routes/author.route.js";
import { v2 as cloudinary } from "cloudinary";
import { connectRabbitMQ } from "./utils/rabbitmq.js";
import { sql } from "./utils/db.js";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.Cloud_Name,
  api_key: process.env.Cloud_Api_Key,
  api_secret: process.env.Cloud_Api_Secret,
});

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
  })
);

connectRabbitMQ();

async function initDB() {
  try {
    await sql`
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

    await sql`
        CREATE TABLE IF NOT EXISTS comments(
        id SERIAL PRIMARY KEY,
        comment VARCHAR(255) NOT NULL,
        userid VARCHAR(255) NOT NULL,
        username VARCHAR(255) NOT NULL,
        blogid VARCHAR(255) NOT NULL,
        create_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        `;

    await sql`
        CREATE TABLE IF NOT EXISTS savedblogs(
        id SERIAL PRIMARY KEY,
        userid VARCHAR(255) NOT NULL,
        blogid VARCHAR(255) NOT NULL,
        create_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        `;

    console.log("database initialized successfully");
  } catch (error) {
    console.log("Error initDb", error);
  }
}

app.use("/api/v1/author", authorRoute);

initDB().then(() => {
  app.listen(port, async () => {
    console.log(`server is running on : ${port}`);
  });
});
