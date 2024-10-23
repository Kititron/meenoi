const mysql = require("mysql2");

// ตั้งค่าการเชื่อมต่อกับฐานข้อมูล local ผ่าน XAMPP
// const db = mysql.createPool({
//   connectionLimit: 10, // จำกัดจำนวน connection
//   host: "localhost", // ใช้ localhost เพราะ phpMyAdmin รันใน XAMPP บนเครื่อง local
//   user: "root", // ชื่อผู้ใช้ค่าเริ่มต้นของ XAMPP
//   password: "", // รหัสผ่าน (ว่างเปล่าใน XAMPP เริ่มต้น)
//   database: "test", // ใส่ชื่อฐานข้อมูลที่คุณสร้างใน phpMyAdmin
//   port: 3306, // ค่า port ของ MySQL


const db = mysql.createPool({
  connectionLimit: 10, // จำกัดจำนวน connection
  host: "139.162.13.242", // ใส่ host ที่ต้องการเชื่อมต่อ
  user: "xholicon_devy", // ชื่อผู้ใช้ฐานข้อมูล
  password: "+#;murgzDWT#", // รหัสผ่าน
  database: "xholicon_meenoi", // ชื่อฐานข้อมูล
  charset: "utf8", // กำหนด character set
  // collation: "utf8_unicode_ci", // กำหนด collation สำหรับฐานข้อมูล
});

// การตรวจสอบการเชื่อมต่อ
db.getConnection((err, connection) => {
  if (err) {
    // กรณี error ต่าง ๆ ที่เชื่อมต่อไม่ได้
    if (err.code === "PROTOCOL_CONNECTION_LOST") {
      console.error("Database connection was closed.");
    } else if (err.code === "ER_CON_COUNT_ERROR") {
      console.error("Database has too many connections.");
    } else if (err.code === "ECONNREFUSED") {
      console.error("Database connection was refused.");
    } else {
      console.error("Database connection failed:", err.message);
    }
    return;
  }

  if (connection) {
    connection.release(); // ปล่อย connection เมื่อไม่ได้ใช้
    console.log("Connected to the database.");
  }
});

// ตรวจสอบการใช้ connection
db.on("acquire", function (connection) {
  console.log("Connection %d acquired", connection.threadId);
});

db.on("release", function (connection) {
  console.log("Connection %d released", connection.threadId);
});

module.exports = db;
