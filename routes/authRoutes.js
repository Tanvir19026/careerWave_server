const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();

// JWT login (issue token)
router.post("/jwt", (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).send({ message: "Email required" });

  const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "1d" });

  res.cookie("token", token, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000,
  });

  res.send({ success: true, message: "JWT issued successfully" });
});

// Logout
router.post("/logout", (req, res) => {
  res.clearCookie("token", { httpOnly: true, secure: false, sameSite: "lax" });
  res.send({ success: true, message: "Logged out successfully" });
});

module.exports = router;
