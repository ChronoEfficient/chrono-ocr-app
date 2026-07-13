import express from "express";
import multer from "multer";
import { extractDocument } from "../controllers/ocr.controller.js";

const router = express.Router();

const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

router.post("/extract", upload.single("document"), extractDocument);

export default router;
