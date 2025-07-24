import getBuffer from "../utils/dataUri.js";
import { sql } from "../utils/db.js";
import { invalidateChacheJob } from "../utils/rabbitmq.js";
import { v2 as cloudinary } from "cloudinary";
import TryCatch from "../utils/TryCatch";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import { GoogleGenAI } from "@google/genai";

export const createBlog = TryCatch(async (req: AuthenticatedRequest, res) => {
  const { title, description, blogcontent, category } = req.body;

  const file = req.file;

  if (!file) {
    res.status(400).json({
      message: "No file to upload",
    });
    return;
  }

  const fileBuffer = getBuffer(file);

  if (!fileBuffer || !fileBuffer.content) {
    res.status(400).json({
      message: "Failed to generate buffer",
    });
    return;
  }

  const cloud = await cloudinary.uploader.upload(fileBuffer.content, {
    folder: "blogs",
  });

  const result =
    await sql`INSERT INTO blogs (title, description, image, blogcontent,category, author) VALUES (${title}, ${description},${cloud.secure_url},${blogcontent},${category},${req.user?._id}) RETURNING *`;

  await invalidateChacheJob(["blogs:*"]);

  return res.json({
    message: "Blog Created",
    blog: result[0],
  });
});
export const updateBlog = TryCatch(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { title, description, blogcontent, category } = req.body;
  const file = req.file;

  const blog = await sql`SELECT * FROM blogs WHERE id=${id}`;
  if (!blog.length) {
    res.status(404).json({
      message: "No blog with this id",
    });
    return;
  }

  if (blog[0].author != req.user?._id) {
    res.status(401).json({
      message: "You are not author of this blog",
    });
    return;
  }

  let imageUrl = blog[0].image;
  if (file) {
    const fileBuffer = getBuffer(file);

    if (!fileBuffer || !fileBuffer.content) {
      res.status(400).json({
        message: "Failed to generate buffer",
      });
      return;
    }

    const cloud = await cloudinary.uploader.upload(fileBuffer.content, {
      folder: "blogs",
    });

    imageUrl = cloud.secure_url;
  }

  const updatedBlog = await sql`UPDATE blogs SET
  title=${title || blog[0].title},
  description = ${description || blog[0].description},
  image= ${imageUrl},
  blogcontent = ${blogcontent || blog[0].blogcontent},
  category = ${category || blog[0].category}

  WHERE id = ${id}
  RETURNING *
  
  `;

  await invalidateChacheJob(["blogs:*", `blog:${id}`]);
  return res.json({
    message: "Blog Updated",
    blog: updatedBlog[0],
  });
});
export const deleteBlog = TryCatch(async (req: AuthenticatedRequest, res) => {
  const blog = await sql`SELECT * FROM blogs WHERE id = ${req.params.id}`;

  if (!blog.length) {
    res.status(404).json({
      message: "No blog with this id",
    });
    return;
  }

  if (blog[0].author !== req.user?._id) {
    res.status(401).json({
      message: "You are not author of this blog",
    });
    return;
  }

  await sql`DELETE FROM savedblogs WHERE blogid = ${req.params.id}`;
  await sql`DELETE FROM comments WHERE blogid = ${req.params.id}`;
  await sql`DELETE FROM blogs WHERE id = ${req.params.id}`;

  await invalidateChacheJob(["blogs:*", `blog:${req.params.id}`]);

  res.json({
    message: "Blog Delete",
  });
});

export const aiTitleResponse = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const { text } = req.body;

    if (!text) return res.status(400).json({ error: "text is required" });

    const prompt = `Suggest an engaging blog post title about: "${text}" and it should be less than 4 words not more than that`;

    const ai = new GoogleGenAI({
      apiKey: process.env.Gemini_Api_Key!,
    });

    const response = await ai.models.generateContent({
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
  }
);
// 2. Generate Blog Description
export const aiDescriptionResponse = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const { title } = req.body;

    if (!title) return res.status(400).json({ error: "Title is required" });

    const prompt = `Write a 2-3 sentence blog description for the blog title: "${title}"`;

    const ai = new GoogleGenAI({
      apiKey: process.env.Gemini_Api_Key!,
    });

    const response = await ai.models.generateContent({
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
  }
);
// 3. Generate Full Blog Content
export const aiBlogResponse = TryCatch(
  async (req: AuthenticatedRequest, res) => {
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

    const ai = new GoogleGenAI({
      apiKey: process.env.Gemini_Api_Key!,
    });

    const response = await ai.models.generateContent({
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
  }
);
