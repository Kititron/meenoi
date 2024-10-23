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
  let { phone, password } = req.body; // เปลี่ยนจาก email เป็น phone

  phone = phone ? phone.trim() : "";
  password = password ? password.trim() : "";

  // ตรวจสอบว่ามีการกรอก phone และ password
  if (!phone || !password) {
    return res
      .status(400)
      .json({ error: "Phone number and password are required" });
  }

  const sql = "SELECT * FROM user WHERE phone = ?"; // เปลี่ยนจาก email เป็น phone

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
            phone: user.phone, // เปลี่ยนจาก email เป็น phone
            name: user.name,
            user_type: user.user_type,
          },
        });
      });
    });
  });
});

router.post("/register", (req, res) => {
  let {
    name,
    phone,
    password,
    image,
    address,
    gps_latitude,
    gps_longitude,
    user_type,
    vehicle_registration, // ทะเบียนรถ (ใช้สำหรับ rider เท่านั้น)
  } = req.body;

  // ลบช่องว่างทั้งหน้าและหลังออกจากค่าที่เป็น string เท่านั้น
  name = name ? name.trim() : "";
  phone = phone ? phone.trim() : "";
  password = password ? password.trim() : "";
  image = image ? image.trim() : "";
  address = address ? address.trim() : "";
  user_type = user_type ? user_type.trim() : "";
  vehicle_registration = vehicle_registration
    ? vehicle_registration.trim()
    : ""; // เพิ่ม

  // gps_latitude และ gps_longitude ไม่จำเป็นต้องใช้ trim() เพราะเป็นตัวเลข
  gps_latitude = gps_latitude ? gps_latitude : null;
  gps_longitude = gps_longitude ? gps_longitude : null;

  // ตรวจสอบว่ามีการกรอกข้อมูลครบถ้วน
  if (!name || !phone || !password || !user_type) {
    return res
      .status(400)
      .send({ status: false, message: "All fields are required" });
  }

  // // ตรวจสอบความยาวพาสเวิร์ด (อย่างน้อย 8 ตัว)
  // if (password.length < 8) {
  //   return res.status(400).send({
  //     status: false,
  //     message: "Password must be at least 8 characters long",
  //   });
  // }

  // // ตรวจสอบรูปแบบหมายเลขโทรศัพท์
  // const phoneRegex = /^[0-9]{10}$/;
  // if (!phoneRegex.test(phone)) {
  //   return res
  //     .status(400)
  //     .send({ status: false, message: "Invalid phone number format" });
  // }

  // ตรวจสอบความยาวพาสเวิร์ด (อย่างน้อย 8 ตัว)
  if (password.length < 3) {
    return res.status(400).send({
      status: false,
      message: "Password must be at least 8 characters long",
    });
  }

  // ตรวจสอบรูปแบบหมายเลขโทรศัพท์
  const phoneRegex = /^[0-9]{3}$/;
  if (!phoneRegex.test(phone)) {
    return res
      .status(400)
      .send({ status: false, message: "Invalid phone number format" });
  }

  // ตรวจสอบว่าหมายเลขโทรศัพท์มีอยู่ในฐานข้อมูลแล้วหรือไม่
  const checkPhoneSql = "SELECT * FROM user WHERE phone = ?";
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

      // ถ้าเป็น rider ให้เพิ่มข้อมูลในตาราง rider ด้วย
      if (user_type === "rider") {
        const riderDetails = {
          name,
          phone,
          password: hashedPassword,
          image,
          vehicle_registration,
        };

        const insertRiderSql =
          "INSERT INTO user (name, phone, password, image, user_type) VALUES (?, ?, ?, ?, ?)";
        db.query(
          insertRiderSql,
          [
            riderDetails.name,
            riderDetails.phone,
            riderDetails.password,
            riderDetails.image,
            "rider",
          ],
          (error, result) => {
            if (error) {
              console.error("Database insert error:", error);
              return res
                .status(500)
                .send({ status: false, message: "Rider registration failed" });
            }

            const userId = result.insertId;
            const insertRiderInfoSql =
              "INSERT INTO rider (user_id, vehicle_registration) VALUES (?, ?)";
            db.query(
              insertRiderInfoSql,
              [userId, vehicle_registration],
              (error) => {
                if (error) {
                  console.error("Database insert error (rider):", error);
                  return res.status(500).send({
                    status: false,
                    message: "Rider info insert failed",
                  });
                }

                res.status(201).send({
                  status: true,
                  message: "Rider registration successful. Please log in.",
                });
              }
            );
          }
        );
      } else {
        // ถ้าเป็น user ให้ใส่ข้อมูลลงในฐานข้อมูล user
        const details = {
          name,
          phone,
          password: hashedPassword,
          image,
          address,
          gps_latitude,
          gps_longitude,
          user_type,
        };
        const insertUserSql = "INSERT INTO user SET ?";
        db.query(insertUserSql, details, (error) => {
          if (error) {
            console.error("Database insert error:", error);
            return res
              .status(500)
              .send({ status: false, message: "Registration failed" });
          }

          res.status(201).send({
            status: true,
            message: "User registration successful. Please log in.",
          });
        });
      }
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
