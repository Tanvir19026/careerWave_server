const express = require("express");
const { ObjectId } = require("mongodb");
const verifyJWT = require("../Middleware/verifyJWT");
const { client } = require("../Config/db");
const router = express.Router();

const userCollection = client.db("rbac_db").collection("users");
const applicantCollection = client.db("rbac_db").collection("applicants");
const recruiterCollection = client.db("rbac_db").collection("recruiters");

const admin = process.env.ADMIN_EMAIL;

router.post("/", async (req, res) => {
  const user = req.body;
  const exists = await userCollection.findOne({ email: user.email });
  if (exists) return res.send({ message: "User already exists" });

  const result = await userCollection.insertOne(user);
  res.send(result);
});

router.get("/", verifyJWT, async (req, res) => {
  const tokenEmail = req.user?.email;
  let users;
  if (tokenEmail === admin) users = await userCollection.find().toArray();
  else users = await userCollection.find({ email: tokenEmail }).toArray();

  res.send(users);
});

router.patch("/:id/role", verifyJWT, async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  const user = await userCollection.findOne({ _id: new ObjectId(id) });
  if (!user) return res.status(404).send({ message: "User not found" });

  await userCollection.updateOne({ _id: new ObjectId(id) }, { $set: { role } });

  const baseInfo = {
    name: user.name,
    email: user.email,
    photoUrl: user.photoUrl,
    createdAt: new Date(),
  };

  if (role === "Applicant") {
    await applicantCollection.updateOne({ email: user.email }, { $set: baseInfo }, { upsert: true });
    await recruiterCollection.deleteOne({ email: user.email });
  } else if (role === "Recruiter") {
    await recruiterCollection.updateOne({ email: user.email }, { $set: baseInfo }, { upsert: true });
    await applicantCollection.deleteOne({ email: user.email });
  } else {
    await applicantCollection.deleteOne({ email: user.email });
    await recruiterCollection.deleteOne({ email: user.email });
  }

  res.send({ success: true, message: `Role updated to ${role}` });
});

module.exports = router;
