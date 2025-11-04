const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const { connectDB } = require("./Config/db");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");

dotenv.config();
const app = express();
const port = process.env.PORT || 5000;

const isProd = process.env.NODE_ENV === "production";

// ------------------- Middleware -------------------
app.use(express.json());
app.use(
  cors({
    origin: isProd
      ? "https://your-frontend.vercel.app" // production frontend
      : "http://localhost:5173",           // local dev frontend
    credentials: true,
  })
);
app.use(cookieParser());

// Uploads folder
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use("/uploads", express.static("uploads"));

// ------------------- Routes -------------------
app.use("/auth", authRoutes);
app.use("/users", userRoutes);

app.get("/", (req, res) => res.send("Server running"));

// ------------------- Start Server -------------------
connectDB().then(() => {
  app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
});
