const express = require("express");
const { ObjectId } = require("mongodb");
const verifyJWT = require("../Middleware/verifyJWT");
const { client } = require("../Config/db");
const router = express.Router();

const userCollection = client.db("rbac_db").collection("users");

// Create user
router.post("/", async (req, res) => {
  const user = req.body;
  const exists = await userCollection.findOne({ email: user.email });
  if (exists) return res.send({ message: "User already exists" });

  const result = await userCollection.insertOne(user);
  res.send(result);
});

// Get user info (protected)
router.get("/", verifyJWT, async (req, res) => {
  const tokenEmail = req.user?.email;
  const users = await userCollection.find({ email: tokenEmail }).toArray();
  res.send(users);
});

module.exports = router;
