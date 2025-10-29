import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

const PORT = process.env.PORT || 4000;
const HOST = process.env.BASE_URL || `http://localhost:${PORT}`;
const API_PREFIX = process.env.API_PREFIX || "/api"; // <-- tambahkan prefix /api secara default

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Task API",
      version: "1.0.0",
      description: "RESTful Task API dengan autentikasi JWT",
    },
    servers: [
      {
        url: `${HOST}${API_PREFIX}`, // server sekarang menunjuk ke http://localhost:PORT/api
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
      schemas: {
        ErrorResponse: {
          type: "object",
          properties: {
            status: { type: "string", example: "error" },
            message: { type: "string", example: "Something went wrong!" },
          },
        },
      },
    },
  },
  apis: [
    path.join(process.cwd(), "routes", "*.js"),
    path.join(process.cwd(), "controllers", "*.js"),
  ],
};

const swaggerSpec = swaggerJsdoc(options);

export { swaggerUi, swaggerSpec };
