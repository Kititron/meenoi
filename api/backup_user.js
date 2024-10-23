const express = require("express");
const db = require("../dbconnect");
const router = express.Router();
// const bcrypt = require("bcrypt");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

router.use(express.json());
router.use(express.urlencoded({ extended: true }));

router.get("/", (req, res) => {
  const sql = "select * from user"; // คำสั่ง SQL เพื่อดึงข้อมูลจากตาราง user
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error executing query:", err);
      return res.status(500).send("Error fetching data from user table");
    }
    res.json(results); // ส่งข้อมูลที่ดึงมาในรูปแบบ JSONgit branch -r
  });
});

router.post("/login", (req, res) => {
  let { email, password } = req.body;

  email = email ? email.trim() : "";
  password = password ? password.trim() : "";

  // ตรวจสอบว่ามีการกรอก email และ password
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const sql = "SELECT * FROM user WHERE email = ?";

  db.query(sql, [email], (error, result) => {
    if (error) {
      console.error("Database query error:", error);
      return res
        .status(500)
        .json({ status: false, message: "Internal server error" });
    }

    if (result.length === 0) {
      return res
        .status(401)
        .json({ status: false, message: "Invalid credentials" });
    }

    const user = result[0];

    // ตรวจสอบพาสเวิร์ด
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) {
        console.error("Password comparison error:", err);
        return res
          .status(500)
          .json({ status: false, message: "Internal server error" });
      }

      if (!isMatch) {
        return res
          .status(401)
          .json({ status: false, message: "Invalid credentials" });
      }

      // ใช้ session_token เก่าถ้ายังมีอยู่ หรือสร้างใหม่
      const sessionToken =
        user.session_token || crypto.randomBytes(64).toString("hex");

      // บันทึก session token และเวลาที่เข้าสู่ระบบ
      const updateSql =
        "UPDATE user SET session_token = ?, last_login = NOW() WHERE id = ?";
      db.query(updateSql, [sessionToken, user.id], (updateError) => {
        if (updateError) {
          console.error("Error updating session token:", updateError);
          return res
            .status(500)
            .json({ status: false, message: "Internal server error" });
        }

        // ส่ง session token และข้อมูลผู้ใช้ให้กับ Frontend
        res.json({
          status: true,
          message: "Login successful",
          session_token: sessionToken,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
        });
      });
    });
  });
});

router.post("/register", (req, res) => {
  let { name, email, password } = req.body;

  // ลบช่องว่างทั้งหน้าและหลังออกจากค่าที่กรอกมา
  name = name ? name.trim() : "";
  email = email ? email.trim() : "";
  password = password ? password.trim() : "";

  // ตรวจสอบว่ามีการกรอกข้อมูลครบถ้วน
  if (!name || !email || !password) {
    return res
      .status(400)
      .send({ status: false, message: "All fields are required" });
  }

  // ตรวจสอบความยาวพาสเวิร์ด (อย่างน้อย 8 ตัว)
  if (password.length < 8) {
    return res.status(400).send({
      status: false,
      message: "Password must be at least 8 characters long",
    });
  }

  // ตรวจสอบรูปแบบอีเมล
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res
      .status(400)
      .send({ status: false, message: "Invalid email format" });
  }

  // ตรวจสอบว่า email มีอยู่ในฐานข้อมูลแล้วหรือไม่
  const checkEmailSql = "SELECT * FROM user WHERE email = ?";
  db.query(checkEmailSql, [email], (error, result) => {
    if (error) {
      console.error("Database error:", error);
      return res.status(500).send({ status: false, message: "Database error" });
    }

    if (result.length > 0) {
      return res
        .status(409)
        .send({ status: false, message: "Email already exists" });
    }

    // แฮชพาสเวิร์ด
    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) {
        console.error("Hashing error:", err);
        return res
          .status(500)
          .send({ status: false, message: "Password hashing failed" });
      }

      // ใส่ข้อมูลลงในฐานข้อมูล
      const details = { name, email, password: hashedPassword };
      const insertSql = "INSERT INTO user SET ?";
      db.query(insertSql, details, (error) => {
        if (error) {
          console.error("Database insert error:", error); // Log the error
          return res
            .status(500)
            .send({ status: false, message: "Registration failed" });
        }

        // ไม่มีการสร้าง session token ที่นี่ เพราะต้องการให้ผู้ใช้ไปล็อกอินก่อน
        res.status(201).send({
          status: true,
          message: "Registration successful. Please log in.",
        });
      });
    });
  });
});

// Middleware ตรวจสอบ session token
const authenticate = (req, res, next) => {
  const sessionToken =
    req.headers.session_token || req.headers["session_token"];

  if (!sessionToken || sessionToken.trim() === "") {
    return res.status(401).json({
      status: false,
      message: "Unauthorized, session token is required",
    });
  }

  const sql = "SELECT * FROM user WHERE session_token = ?";

  db.query(sql, [sessionToken], (error, result) => {
    if (error) {
      console.error("Database query error:", error);
      return res
        .status(500)
        .json({ status: false, message: "Internal server error" });
    }

    if (result.length === 0) {
      return res
        .status(401)
        .json({ status: false, message: "Invalid or expired session token" });
    }

    req.user = result[0]; // เก็บข้อมูลผู้ใช้เพื่อใช้งานใน request ถัดไป
    next(); // ส่งต่อไปยัง route ถัดไป
  });
};

// Route สำหรับ Logout
router.post("/logout", authenticate, (req, res) => {
  const userId = req.user.id;

  const sql = "UPDATE user SET session_token = NULL WHERE id = ?";

  db.query(sql, [userId], (error) => {
    if (error) {
      console.error("Error clearing session token:", error);
      return res
        .status(500)
        .json({ status: false, message: "Failed to logout" });
    }

    res.json({ status: true, message: "Logout successful" });
  });
});

// Route ที่ใช้ middleware ตรวจสอบการล็อกอิน
router.get("/protected", authenticate, (req, res) => {
  res.json({
    status: true,
    message: "This is a protected route",
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
    },
  });
});

module.exports = router;
