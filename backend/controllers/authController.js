const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.signup = (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: "name, email and password are required" });
  }

  db.query("SELECT id FROM users WHERE email = ?", [email], async (err, rows) => {
    if (err) return res.status(500).json(err);
    if (rows.length > 0) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const query = "INSERT INTO users (name, email, password) VALUES (?, ?, ?)";

    db.query(query, [name, email, hashedPassword], (insertErr, result) => {
      if (insertErr) return res.status(500).json(insertErr);

      const token = jwt.sign(
        { id: result.insertId, email },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );

      res.json({
        message: "User registered successfully",
        token,
        user: { id: result.insertId, name, email }
      });
    });
  });
};

exports.login = (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "email and password are required" });
  }

  const query = "SELECT * FROM users WHERE email = ?";

  db.query(query, [email], async (err, result) => {
    if (err) return res.status(500).json(err);

    if (result.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = result[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });
  });
};

exports.me = (req, res) => {
  db.query(
    "SELECT id, name, email FROM users WHERE id = ?",
    [req.user.id],
    (err, result) => {
      if (err) return res.status(500).json(err);
      if (result.length === 0) return res.status(404).json({ message: "User not found" });
      res.json({ user: result[0] });
    }
  );
};

exports.logout = (_req, res) => {
  res.json({ message: "Logout successful on client side" });
};
