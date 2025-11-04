const express = require("express");
const { ObjectId } = require("mongodb");
const verifyJWT = require("../Middleware/verifyJWT");
const { client } = require("../Config/db");

const router = express.Router();
const jobCollection = client.db("rbac_db").collection("jobs");

router.post("/", async (req, res) => {
  const job = req.body;
  const result = await jobCollection.insertOne(job);
  res.send(result);
});

router.get("/", async (req, res) => {
  const jobs = await jobCollection.find().toArray();
  res.send(jobs);
});

router.get("/email/:email", verifyJWT, async (req, res) => {
  const { email } = req.params;
  if (email !== req.user?.email) return res.status(403).send({ message: "Forbidden" });

  const jobs = await jobCollection.find({ companyEmail: email }).toArray();
  res.send(jobs);
});

router.get("/:id", async (req, res) => {
  const job = await jobCollection.findOne({ _id: new ObjectId(req.params.id) });
  res.send(job);
});

router.patch("/:id", verifyJWT, async (req, res) => {
  const result = await jobCollection.updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: req.body }
  );
  res.send(result);
});

router.delete("/:id", async (req, res) => {
  const result = await jobCollection.deleteOne({ _id: new ObjectId(req.params.id) });
  res.send(result);
});

module.exports = router;
