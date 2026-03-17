// server.js
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

// -------------------
// MongoDB User Schema
// -------------------
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, sparse: true },
  password: String,
  role: { type: String, enum: ["User", "Worker"], default: "User" },
  workerId: { type: String, unique: true, sparse: true },
  department: String,
  workerImage: String,
});

const User = mongoose.model("User", userSchema);

// -------------------
// Connect to MongoDB
// -------------------
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

// -------------------
// Signup Route
// -------------------
app.post("/api/signup", async (req, res) => {
  const { name, email, password, role, workerId, department, workerImage } = req.body;

  try {
    // Check if user exists
    if (role === "User" && await User.findOne({ email })) {
      return res.status(400).json({ success: false, message: "Email already exists" });
    }
    if (role === "Worker" && await User.findOne({ workerId })) {
      return res.status(400).json({ success: false, message: "Worker ID already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email: role === "User" ? email : undefined,
      password: hashedPassword,
      role,
      workerId: role === "Worker" ? workerId : undefined,
      department: role === "Worker" ? department : undefined,
      workerImage,
    });

    await user.save();

    res.json({ success: true, message: "User created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------
// Login Route
// -------------------
app.post("/api/login", async (req, res) => {
  const { email, workerId, password, role } = req.body; // <-- fixed keys

  try {
    const user = role === "User"
      ? await User.findOne({ email })
      : await User.findOne({ workerId });

    if (!user) return res.status(400).json({ success: false, message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ success: false, message: "Invalid password" });

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: "1d" });

    res.json({ success: true, token, user: { name: user.name, role: user.role } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------
// Protected Route Example
// -------------------
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ success: false, message: "No token provided" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ success: false, message: "Invalid token" });
  }
};

app.get("/api/profile", authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json({ success: true, user });
});

// -------------------
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));