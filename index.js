const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const { connectDB, client } = require("./Config/db");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const applicantRoutes = require("./routes/applicantRoutes");
const recruiterRoutes = require("./routes/recruiterRoutes");
const jobRoutes = require("./routes/jobRoutes");
const applicationRoutes = require("./routes/applicationRoutes");

dotenv.config();
const app = express();
const port = process.env.PORT || 5000;

// ------------------- Middleware -------------------
app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(cookieParser());

// Uploads folder
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use("/uploads", express.static("uploads"));

// ------------------- Routes -------------------
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/applicants", applicantRoutes);
app.use("/recruiters", recruiterRoutes);
app.use("/jobs", jobRoutes);
app.use("/applications", applicationRoutes);

app.get("/", (req, res) => res.send("Server running rbac_server"));

// ------------------- Start Server -------------------
connectDB().then(() => {
  app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
});
