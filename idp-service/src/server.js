import "dotenv/config";
import express from "express";
import ocrRoutes from "./routes/ocr.routes.js";

const app = express();

app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "idp-service",
    version: "1.0.0",
    timestamp: new Date().toISOString()
  });
});

// OCR routes
app.use("/ocr", ocrRoutes);

// Default route
app.get("/", (req, res) => {
  res.json({
    message: "Chrono Intelligent Document Processing (IDP) Service",
    endpoints: {
      health: "/health",
      extract: "POST /ocr/extract"
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: "Endpoint not found"
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);

  res.status(500).json({
    status: "error",
    message: "Internal Server Error"
  });
});

const port = process.env.PORT || 8080;

app.listen(port, () => {
  console.log("==================================");
  console.log(" Chrono IDP Service Started");
  console.log("==================================");
  console.log(`Environment : ${process.env.NODE_ENV || "development"}`);
  console.log(`Port        : ${port}`);
  console.log(`Health URL  : http://localhost:${port}/health`);
  console.log(`OCR URL     : http://localhost:${port}/ocr/extract`);
  console.log("==================================");
});
