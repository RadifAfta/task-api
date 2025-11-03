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
      description: `
## 🚀 Task Management API

RESTful API untuk manajemen task dengan fitur authentication dan authorization.

### 🔑 Authentication
API ini menggunakan JWT (JSON Web Token) untuk authentication. Setelah login, gunakan token yang didapat untuk mengakses protected endpoints.

### 📋 Features
- **Authentication**: Register, Login dengan JWT
- **Task Management**: CRUD operations untuk task
- **Pagination**: Support pagination untuk list data
- **Admin Panel**: Endpoint khusus untuk admin
- **Role-based Access**: User dan Admin roles

### 🔄 Quick Start
1. Register user baru di \`/auth/register\`
2. Login di \`/auth/login\` untuk mendapatkan token
3. Gunakan token untuk mengakses protected endpoints
4. Set Authorization header: \`Bearer YOUR_TOKEN\`

### 📖 Documentation
Gunakan tombol **"Try it out"** pada setiap endpoint untuk testing langsung.
      `,
      contact: {
        name: "API Support",
        email: "support@taskapi.com"
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT"
      }
    },
    servers: [
      {
        url: `${HOST}${API_PREFIX}`,
        description: "Development Server"
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { 
          type: "http", 
          scheme: "bearer", 
          bearerFormat: "JWT",
          description: "Masukkan JWT token dengan format: Bearer YOUR_TOKEN"
        },
      },
      schemas: {
        ErrorResponse: {
          type: "object",
          properties: {
            status: { type: "string", example: "error" },
            message: { type: "string", example: "Something went wrong!" },
          },
        },
        SuccessResponse: {
          type: "object",
          properties: {
            status: { type: "string", example: "success" },
            message: { type: "string", example: "Operation completed successfully" },
          },
        },
      },
    },
    tags: [
      {
        name: "Auth",
        description: "Authentication endpoints - Register dan Login"
      },
      {
        name: "Tasks", 
        description: "Task management endpoints - CRUD operations untuk task"
      },
      {
        name: "Admin",
        description: "Admin-only endpoints - Requires admin role"
      }
    ]
  },
  apis: [
    path.join(process.cwd(), "routes", "*.js"),
    path.join(process.cwd(), "controllers", "*.js"),
  ],
};

const swaggerSpec = swaggerJsdoc(options);

export { swaggerUi, swaggerSpec };
