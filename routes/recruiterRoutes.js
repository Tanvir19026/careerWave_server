const express = require("express");
const { ObjectId } = require("mongodb");
const verifyJWT = require("../Middleware/verifyJWT");
const { client } = require("../Config/db");

const router = express.Router();
const recruiterCollection = client.db("rbac_db").collection("recruiters");
const admin = process.env.ADMIN_EMAIL;

router.get("/", verifyJWT, async (req, res) => {
  if (req.user.email !== admin) return res.status(403).send({ message: "Forbidden" });
  const recruiters = await recruiterCollection.find().toArray();
  res.send(recruiters);
});

router.delete("/:id", verifyJWT, async (req, res) => {
  if (req.user.email !== admin) return res.status(403).send({ message: "Admins only" });
  const result = await recruiterCollection.deleteOne({ _id: new ObjectId(req.params.id) });
  res.send(result);
});

module.exports = router;
