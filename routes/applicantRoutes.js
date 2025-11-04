const express = require("express");
const { ObjectId } = require("mongodb");
const verifyJWT = require("../Middleware/verifyJWT");
const { client } = require("../Config/db");

const router = express.Router();
const applicantCollection = client.db("rbac_db").collection("applicants");
const admin = process.env.ADMIN_EMAIL;

router.get("/", verifyJWT, async (req, res) => {
  if (req.user.email !== admin) return res.status(403).send({ message: "Forbidden" });
  const applicants = await applicantCollection.find().toArray();
  res.send(applicants);
});

router.delete("/:id", verifyJWT, async (req, res) => {
  if (req.user.email !== admin) return res.status(403).send({ message: "Admins only" });
  const result = await applicantCollection.deleteOne({ _id: new ObjectId(req.params.id) });
  res.send(result);
});

module.exports = router;
