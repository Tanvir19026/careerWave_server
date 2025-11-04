const express = require("express");
const { ObjectId } = require("mongodb");
const path = require("path");
const fs = require("fs");
const verifyJWT = require("../Middleware/verifyJWT");
const { client } = require("../Config/db");
const upload = require("../utils/upload"); // multer setup

const router = express.Router();
const applicationCollection = client.db("rbac_db").collection("applications");
const jobCollection = client.db("rbac_db").collection("jobs");
const admin = process.env.ADMIN_EMAIL;

// CREATE new application
router.post("/", upload.single("resume"), async (req, res) => {
  try {
    const file = req.file;
    const metadata = JSON.parse(req.body.metadata);
    if (!file) throw new Error("Resume missing");

    const application = {
      ...metadata,
      resumeUrl: `/uploads/${file.filename}`,
      submittedAt: new Date(),
    };
    const result = await applicationCollection.insertOne(application);
    res.send({ success: true, insertedId: result.insertedId });
  } catch (error) {
    res.status(500).send({ success: false, message: error.message });
  }
});

// GET all applications (based on role)
router.get("/", verifyJWT, async (req, res) => {
  try {
    const tokenEmail = req.user?.email;
    let apps;

    if (tokenEmail === admin) {
      apps = await applicationCollection.find().toArray();
    } else {
      const recruiterJobs = await jobCollection.find({ companyEmail: tokenEmail }).toArray();
      const jobIds = recruiterJobs.map(j => j._id.toString());

      if (jobIds.length > 0) {
        apps = await applicationCollection.find({ jobId: { $in: jobIds } }).toArray();
      } else {
        apps = await applicationCollection.find({ applicantEmail: tokenEmail }).toArray();
      }
    }
    res.send(apps);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// GET single application
router.get("/:id", async (req, res) => {
  try {
    const app = await applicationCollection.findOne({ _id: new ObjectId(req.params.id) });
    if (!app) return res.status(404).send({ message: "Not found" });
    res.send(app);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// UPDATE application
router.patch("/:id", upload.single("resume"), async (req, res) => {
  try {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const existing = await applicationCollection.findOne(filter);
    if (!existing) return res.status(404).send({ success: false, message: "Not found" });

    const updateFields = { ...req.body };
    delete updateFields.jobTitle; // prevent updating jobTitle

    if (req.file) {
      const newResume = `/uploads/${req.file.filename}`;
      if (existing.resumeUrl) {
        const oldPath = path.join(__dirname, "..", existing.resumeUrl);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      updateFields.resumeUrl = newResume;
    }

    const result = await applicationCollection.updateOne(filter, { $set: updateFields });
    res.send(result);
  } catch (error) {
    res.status(500).send({ success: false, message: error.message });
  }
});

// DELETE application
router.delete("/:id", verifyJWT, async (req, res) => {
  try {
    const result = await applicationCollection.deleteOne({ _id: new ObjectId(req.params.id) });
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

module.exports = router;
