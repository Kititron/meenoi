const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const db = require("./dbconnect");

const user = require("./api/users");
const admin = require("./api/admin");
const product = require("./api/product");
const cart = require("./api/cart");
const rider = require("./api/rider");

const app = express();

// กำหนด middleware ก่อน route
app.use(cors());
app.use(bodyParser.text());
app.use(bodyParser.json());

app.use("/users", user);
app.use("/riders", rider);
app.use("/admin", admin);
app.use("/product", product);
app.use("/cart", cart);

// // Middleware ตรวจสอบ session token
// const authenticate = (req, res, next) => {
//   const sessionToken =
//     req.headers.session_token || req.headers["session_token"]; // รองรับรูปแบบการเขียนทั้งสองแบบ

//   if (!sessionToken || sessionToken.trim() === "") {
//     return res.status(401).json({
//       status: false,
//       message: "Unauthorized, session token is required",
//     });
//   }

//   const sql = "SELECT * FROM user WHERE session_token = ?";

//   db.query(sql, [sessionToken], (error, result) => {
//     if (error) {
//       console.error("Database query error:", error);
//       return res
//         .status(500)
//         .json({ status: false, message: "Internal server error" });
//     }

//     if (result.length === 0) {
//       return res
//         .status(401)
//         .json({ status: false, message: "Invalid or expired session token" });
//     }

//     req.user = result[0]; // เก็บข้อมูลผู้ใช้เพื่อใช้งานใน request ถัดไป
//     next(); // ส่งต่อไปยัง route ถัดไป
//   });
// };

// // ใช้ middleware ตรวจสอบการล็อกอิน
// app.use("/protected", authenticate, (req, res) => {
//   res.json({
//     status: true,
//     message: "This is a protected route",
//     user: {
//       id: req.user.id,
//       email: req.user.email,
//       name: req.user.name,
//     },
//   });
// });

module.exports = app;
