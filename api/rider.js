const express = require("express");
const db = require("../dbconnect");
const router = express.Router();
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

router.use(express.json());
router.use(express.urlencoded({ extended: true }));

router.get("/", (req, res) => {
  const sql = "select * from rider"; // คำสั่ง SQL เพื่อดึงข้อมูลจากตาราง user
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error executing query:", err);
      return res.status(500).send("Error fetching data from user table");
    }
    res.json(results); // ส่งข้อมูลที่ดึงมาในรูปแบบ JSONgit branch -r
  });
});

router.post("/login", (req, res) => {
  let { phone, password } = req.body; // เปลี่ยนจาก email เป็น phone

  phone = phone ? phone.trim() : "";
  password = password ? password.trim() : "";

  // ตรวจสอบว่ามีการกรอก phone และ password
  if (!phone || !password) {
    return res
      .status(400)
      .json({ error: "Phone number and password are required" });
  }

  const sql = "SELECT * FROM rider WHERE phone = ?"; // เปลี่ยนจาก user เป็น rider

  db.query(sql, [phone], (error, result) => {
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

    const rider = result[0];

    // ตรวจสอบพาสเวิร์ด
    bcrypt.compare(password, rider.password, (err, isMatch) => {
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
        rider.session_token || crypto.randomBytes(64).toString("hex");

      // บันทึก session token และเวลาที่เข้าสู่ระบบ
      const updateSql =
        "UPDATE rider SET session_token = ?, last_login = NOW() WHERE id = ?";
      db.query(updateSql, [sessionToken, rider.id], (updateError) => {
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
          rider: {
            id: rider.id,
            phone: rider.phone, // เปลี่ยนจาก email เป็น phone
            name: rider.name,
            license_plate: rider.license_plate, // ส่งป้ายทะเบียนด้วย
          },
        });
      });
    });
  });
});

router.post("/register", (req, res) => {
  let { name, phone, password, image, license_plate } = req.body;

  // ลบช่องว่างทั้งหน้าและหลังออกจากค่าที่กรอกมา
  name = name ? name.trim() : "";
  phone = phone ? phone.trim() : "";
  password = password ? password.trim() : "";
  image = image ? image.trim() : "";
  license_plate = license_plate ? license_plate.trim() : "";

  // ตรวจสอบว่ามีการกรอกข้อมูลครบถ้วน
  if (!name || !phone || !password || !image || !license_plate) {
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

  // ตรวจสอบรูปแบบหมายเลขโทรศัพท์ (คุณสามารถเพิ่มเงื่อนไขเพิ่มเติมได้ตามความต้องการ)
  const phoneRegex = /^[0-9]{10}$/;
  if (!phoneRegex.test(phone)) {
    return res
      .status(400)
      .send({ status: false, message: "Invalid phone number format" });
  }

  // ตรวจสอบว่าหมายเลขโทรศัพท์มีอยู่ในฐานข้อมูลแล้วหรือไม่
  const checkPhoneSql = "SELECT * FROM rider WHERE phone = ?";
  db.query(checkPhoneSql, [phone], (error, result) => {
    if (error) {
      console.error("Database error:", error);
      return res.status(500).send({ status: false, message: "Database error" });
    }

    if (result.length > 0) {
      return res
        .status(409)
        .send({ status: false, message: "Phone number already exists" });
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
      const details = {
        name,
        phone,
        password: hashedPassword,
        image,
        license_plate, // เพิ่มป้ายทะเบียนเข้าไป
      };
      const insertSql = "INSERT INTO rider SET ?";
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

module.exports = router;
