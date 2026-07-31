import "dotenv/config";
import express from "express";
import documentRoutes from "./api/routes/document.routes.js";

const app = express();

app.disable("x-powered-by");

app.use(
  express.json({
    limit: "1mb"
  })
);

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

  if (res.headersSent) {
    return next(error);
  }

  res.status(500).json({
    status: "error",
    message: "Internal server error"
  });
});

const port = Number(process.env.PORT || 8080);

const server = app.listen(port, "0.0.0.0", () => {
  console.log("==================================");
  console.log(" Chrono IDP Service Started");
  console.log("==================================");
  console.log(
    `Environment  : ${process.env.NODE_ENV || "development"}`
  );
  console.log(`Port         : ${port}`);
  console.log(`Health       : http://localhost:${port}/health`);
  console.log(
    `Documents API: http://localhost:${port}/documents/extract`
  );
  console.log(
    `Legacy API   : http://localhost:${port}/ocr/extract`
  );
  console.log("==================================");
});

function shutdown(signal) {
  console.log(`${signal} received. Shutting down gracefully.`);

  server.close((error) => {
    if (error) {
      console.error("Error during shutdown:", error);
      process.exit(1);
    }

    console.log("HTTP server closed.");
    process.exit(0);
  });

  setTimeout(() => {
    console.error("Forced shutdown after timeout.");
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
