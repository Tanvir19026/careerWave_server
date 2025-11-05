const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// ------------------- Middleware -------------------
app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:5173"], // React frontend URL
    credentials: true,
  })
);

// Serve uploaded files
app.use("/uploads", express.static("uploads"));

// ------------------- Uploads Folder -------------------
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// ------------------- MongoDB Setup -------------------
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@rbac-cluster.chiajtz.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// ------------------- Main Function -------------------
async function run() {
  try {
    await client.connect();
    const db = client.db("rbac_db");

    const userCollection = db.collection("users");
    const jobCollection = db.collection("jobs");
    const applicationCollection = db.collection("applications");
    const recruiterCollection = db.collection("recruiters");
    const applicantCollection = db.collection("applicants");
    const admin = process.env.ADMIN_EMAIL;

    // ------------------- Applicant Routes -------------------
    app.get("/applicantlist", async (req, res) => {
      const { email } = req.query; // frontend must send ?email=...
      if (email !== admin) {
        return res.status(403).send({ message: "Forbidden - Admin only" });
      }
      const applicants = await applicantCollection.find().toArray();
      res.send(applicants);
    });

    app.delete("/applicants/:id", async (req, res) => {
      const { id } = req.params;
      const { email } = req.query;
      if (email !== admin) {
        return res.status(403).send({ message: "Forbidden - Admin only" });
      }
      const result = await applicantCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // ------------------- Recruiter Routes -------------------
    app.get("/recruiterlist", async (req, res) => {
      const { email } = req.query;
      if (email !== admin) {
        return res.status(403).send({ message: "Forbidden - Admin only" });
      }
      const recruiters = await recruiterCollection.find().toArray();
      res.send(recruiters);
    });

    app.delete("/recruiterlist/:id", async (req, res) => {
      const { id } = req.params;
      const { email } = req.query;
      if (email !== admin) {
        return res.status(403).send({ message: "Forbidden - Admin only" });
      }
      const result = await recruiterCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // ------------------- User APIs -------------------
    app.post("/users", async (req, res) => {
      const user = req.body;
      const exists = await userCollection.findOne({ email: user.email });
      if (exists) {
        return res.send({ message: "User already exists" });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.get("/users", async (req, res) => {
      const { email } = req.query;
      try {
        let user;
        if (email === admin) {
          user = await userCollection.find().toArray();
        } else {
          user = await userCollection.find({ email }).toArray();
        }
        if (!user || user.length === 0) {
          return res.status(404).send({ message: "User not found" });
        }
        res.send(user);
      } catch (err) {
        res.status(500).send({ message: err.message });
      }
    });

    // Update user role
    app.patch("/users/:id/role", async (req, res) => {
      const { id } = req.params;
      const { role } = req.body;
      try {
        const user = await userCollection.findOne({ _id: new ObjectId(id) });
        if (!user) return res.status(404).send({ message: "User not found" });

        await userCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { role } }
        );

        const baseInfo = {
          name: user.name,
          email: user.email,
          photoUrl: user.photoUrl,
          createdAt: new Date(),
        };

        if (role === "Applicant") {
          await applicantCollection.updateOne(
            { email: user.email },
            { $set: baseInfo },
            { upsert: true }
          );
          await recruiterCollection.deleteOne({ email: user.email });
        } else if (role === "Recruiter") {
          await recruiterCollection.updateOne(
            { email: user.email },
            { $set: baseInfo },
            { upsert: true }
          );
          await applicantCollection.deleteOne({ email: user.email });
        } else {
          await applicantCollection.deleteOne({ email: user.email });
          await recruiterCollection.deleteOne({ email: user.email });
        }

        res.send({ success: true, message: `Role updated to ${role}` });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: error.message });
      }
    });

    // ------------------- Job APIs -------------------
    app.post("/jobs", async (req, res) => {
      const jobList = req.body;
      const result = await jobCollection.insertOne(jobList);
      res.send(result);
    });

    app.get("/jobs", async (req, res) => {
      const jobs = await jobCollection.find().toArray();
      res.send(jobs);
    });

    app.get("/jobs/email/:email", async (req, res) => {
      const email = req.params.email;
      const query = { companyEmail: email };
      const jobs = await jobCollection.find(query).toArray();
      res.send(jobs);
    });

    app.get("/jobs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const job = await jobCollection.findOne(query);
      res.send(job);
    });

    app.delete("/jobs/:id", async (req, res) => {
      const id = req.params.id;
      const result = await jobCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    app.patch("/jobs/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const updateData = req.body;
        const result = await jobCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        );
        res.send({ success: result.modifiedCount > 0 });
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: err.message });
      }
    });

    // ------------------- Applications -------------------
  // ------------------- Applications Routes -------------------

// Create a new application
app.post("/applications", upload.single("resume"), async (req, res) => {
  try {
    const file = req.file;
    const metadata = req.body.metadata;
    if (!file) throw new Error("Resume file missing");
    if (!metadata) throw new Error("Metadata missing");

    const applicationData = JSON.parse(metadata);

    // Convert jobId to string to match frontend usage
    const application = {
      ...applicationData,
      jobId: applicationData.jobId.toString(),
      resumeUrl: `/uploads/${file.filename}`,
      submittedAt: new Date(),
    };

    const result = await applicationCollection.insertOne(application);
    res.send({ success: true, insertedId: result.insertedId });
  } catch (error) {
    console.error(error);
    res.status(500).send({ success: false, message: error.message });
  }
});

// Get applications (for admin or recruiter)
app.get("/applications", async (req, res) => {
  try {
    const { email } = req.query;
    let applications;

    if (email === admin) {
      // Admin sees all applications
      applications = await applicationCollection.find().toArray();
    } else {
      // Recruiter sees only applications for their jobs
      const recruiterJobs = await jobCollection.find({ companyEmail: email }).toArray();
      const jobIds = recruiterJobs.map((job) => job._id.toString());

      if (jobIds.length > 0) {
        applications = await applicationCollection.find({
          jobId: { $in: jobIds }, // match string jobId
        }).toArray();
      } else {
        // Applicant sees their own applications
        applications = await applicationCollection.find({
          applicantEmail: email,
        }).toArray();
      }
    }

    res.send(applications);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: err.message });
  }
});

// Get a single application by ID
app.get("/applications/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const application = await applicationCollection.findOne({
      _id: new ObjectId(id),
    });
    res.send(application);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: err.message });
  }
});

// Update an application (status or resume)
app.patch("/applications/:id", upload.single("resume"), async (req, res) => {
  try {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const existing = await applicationCollection.findOne(filter);
    if (!existing)
      return res.status(404).send({ message: "Application not found" });

    const updateFields = { ...req.body };

    // Remove jobTitle if present
    if ("jobTitle" in updateFields) delete updateFields.jobTitle;

    // Update resume file if uploaded
    if (req.file) {
      const newPath = `/uploads/${req.file.filename}`;
      if (existing.resumeUrl) {
        const oldPath = path.join(__dirname, existing.resumeUrl);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      updateFields.resumeUrl = newPath;
    }

    await applicationCollection.updateOne(filter, {
      $set: updateFields,
    });

    res.send({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: error.message });
  }
});

// Delete an application
app.delete("/applications/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const result = await applicationCollection.deleteOne({ _id: new ObjectId(id) });
    res.send(result);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: err.message });
  }
});


    // ------------------- Root -------------------
    app.get("/", (req, res) => {
      res.send("Server running without JWT or cookies 🚀");
    });

    console.log("✅ Connected to MongoDB successfully!");
  } finally {
    // Keep connection open
  }
}
run().catch(console.dir);

// ------------------- Start Server -------------------
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
