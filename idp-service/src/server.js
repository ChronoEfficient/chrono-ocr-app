import "dotenv/config";
import express from "express";
import documentRoutes from "./routes/document.routes.js";

const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "idp-service",
    version: "1.0.0",
    timestamp: new Date().toISOString()
  });
});

app.use("/documents", documentRoutes);

// Retained temporarily so existing integrations do not break.
app.use("/ocr", documentRoutes);

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Chrono Intelligent Document Processing Service",
    endpoints: {
      health: "GET /health",
      extractDocument: "POST /documents/extract",
      legacyExtract: "POST /ocr/extract"
    }
  });
});

app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: "Endpoint not found"
  });
});

app.use((error, req, res, next) => {
  console.error("Unhandled application error:", error);

  res.status(500).json({
    status: "error",
    message: "Internal server error"
  });
});

const port = process.env.PORT || 8080;

app.listen(port, () => {
  console.log("==================================");
  console.log(" Chrono IDP Service Started");
  console.log("==================================");
  console.log(`Environment  : ${process.env.NODE_ENV || "development"}`);
  console.log(`Port         : ${port}`);
  console.log(`Health       : http://localhost:${port}/health`);
  console.log(`Documents API: http://localhost:${port}/documents/extract`);
  console.log(`Legacy API   : http://localhost:${port}/ocr/extract`);
  console.log("==================================");
});
