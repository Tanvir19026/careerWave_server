const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();

// JWT login (issue token)
router.post("/jwt", (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).send({ message: "Email required" });

  const token = jwt.sign({ email }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  }); // 🔑 Login: Must use secure: true and sameSite: "None" for cross-origin HTTPS deployment

  res.cookie("token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    maxAge: 24 * 60 * 60 * 1000,
  });

  res.send({ success: true, message: "JWT issued successfully" });
});

// Logout
router.post("/logout", (req, res) => {
  // 🔑 Logout: Settings MUST match the login settings (secure: true, sameSite: "None")
  // to ensure the browser deletes the correct cookie from its storage.
  res.clearCookie("token", { httpOnly: true, secure: true, sameSite: "None" });
  res.send({ success: true, message: "Logged out successfully" });
});

module.exports = router;
