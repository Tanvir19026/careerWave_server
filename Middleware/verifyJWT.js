const jwt = require("jsonwebtoken");

function verifyJWT(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).send({ message: "Unauthorized - No token found" });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).send({ message: "Forbidden - Invalid token" });
    req.user = decoded;
    next();
  });
}

module.exports = verifyJWT;
