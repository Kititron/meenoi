const express = require("express");
const db = require("../dbconnect");
const router = express.Router();

router.use(express.json());
router.use(express.urlencoded({ extended: true }));

router.post("/add", (req, res) => {
    // รับข้อมูลจาก JSON body
    const { uid, number, amount } = req.body;
  
    // ตรวจสอบว่ามีข้อมูลครบถ้วน
    if (!uid || !number || !amount) {
      return res.status(400).send("Missing required fields: uid, number, or amount");
    }
  
    // คำนวณ price โดยการนำ amount * 100
    const price = amount * 100;
  
    // คำสั่ง SQL เพื่อทำการ INSERT ข้อมูลเข้า table cart
    const sql = "INSERT INTO cart (uid, number, amount, price) VALUES (?, ?, ?, ?)";
  
    // Execute the SQL query
    db.query(sql, [uid, number, amount, price], (err, results) => {
      if (err) {
        console.error("Error executing query:", err);
        return res.status(500).send("Error inserting data into cart table");
      }
  
      // ส่ง response กลับถ้าสำเร็จ
      res.status(201).send("Data inserted successfully");
    });
  });
  
  router.get("/show", (req, res) => {
    const sql = "select * from cart"; // คำสั่ง SQL เพื่อดึงข้อมูลจากตาราง user
    db.query(sql, (err, results) => {
      if (err) {
        console.error("Error executing query:", err);
        return res.status(500).send("Error fetching data from user table");
      }
      res.json(results); // ส่งข้อมูลที่ดึงมาในรูปแบบ JSONgit branch -r
    });
  });

  router.get("/", (req, res) => {
    // รับ userId ที่ส่งมาใน query parameter
    const userId = req.query.userId;
  
    if (!userId) {
      return res.status(400).send("User ID is required");
    }
  
    // คำสั่ง SQL เพื่อดึงข้อมูลจากตาราง cart ที่มี uid ตรงกับ userId ที่ส่งมา
    const sql = "SELECT * FROM cart WHERE uid = ?";
  
    // Execute the SQL query พร้อมส่ง userId เป็นพารามิเตอร์
    db.query(sql, [userId], (err, results) => {
      if (err) {
        console.error("Error executing query:", err);
        return res.status(500).send("Error fetching data from cart table");
      }
  
      // ส่งข้อมูลที่ดึงมาในรูปแบบ JSON
      res.json(results);
    });
  });
  
  
  router.post("/pay", (req, res) => {
    // รับ userId ที่ส่งมาใน body
    const userId = req.body.uid;
  
    // ตรวจสอบว่า userId ถูกส่งมาหรือไม่
    if (!userId) {
      return res.status(400).send("User ID is required");
    }
  
    // คำสั่ง SQL เพื่อดึงข้อมูลจากตาราง cart ที่มี uid ตรงกับ userId ที่ส่งมา
    const sqlCart = "SELECT number, price FROM cart WHERE uid = ?";
  
    // Execute the SQL query พร้อมส่ง userId เป็นพารามิเตอร์
    db.query(sqlCart, [userId], (err, cartResults) => {
      if (err) {
        console.error("Error executing query:", err);
        return res.status(500).send("Error fetching data from cart table");
      }
  
      // ตรวจสอบว่ามีสินค้าใน cart หรือไม่
      if (cartResults.length === 0) {
        return res.status(404).send("No items found in cart");
      }
  
      // คำนวณ sum ของ price ทั้งหมด
      const sumPrice = cartResults.reduce((total, item) => total + item.price, 0);
  
      // ดึงข้อมูล user ว่า money มีเท่าไหร่
      const sqlUser = "SELECT money FROM user WHERE id = ?";
      db.query(sqlUser, [userId], (err, userResults) => {
        if (err) {
          console.error("Error executing query:", err);
          return res.status(500).send("Error fetching data from user table");
        }
  
        if (userResults.length === 0) {
          return res.status(404).send("User not found");
        }
  
        const userMoney = userResults[0].money;
  
        // ตรวจสอบว่ามีเงินเพียงพอหรือไม่
        if (userMoney < sumPrice) {
          return res.status(400).send("Insufficient funds");
        }
  
        // คำนวณเงินที่เหลือหลังจากการจ่ายเงิน
        const updatedMoney = userMoney - sumPrice;
  
        // อัปเดตค่า money ในตาราง user
        const sqlUpdateUser = "UPDATE user SET money = ? WHERE id = ?";
        db.query(sqlUpdateUser, [updatedMoney, userId], (err, updateResults) => {
          if (err) {
            console.error("Error executing query:", err);
            return res.status(500).send("Error updating user money");
          }
  
          // หลังจากอัปเดตค่า money เสร็จแล้ว ทำการลบรายการใน cart
          const sqlDeleteCart = "DELETE FROM cart WHERE uid = ?";
          db.query(sqlDeleteCart, [userId], (err, deleteResults) => {
            if (err) {
              console.error("Error executing query:", err);
              return res.status(500).send("Error deleting items from cart");
            }
  
            // ลบข้อมูลใน product โดยใช้ number จาก cart
            cartResults.forEach((item) => {
              const sqlDeleteProduct = "DELETE FROM product WHERE number = ?";
              db.query(sqlDeleteProduct, [item.number], (err, deleteProductResults) => {
                if (err) {
                  console.error("Error deleting product number:", err);
                  return res.status(500).send("Error deleting product number");
                }
              });
            });
  
            // ส่ง response กลับหลังจากลบและอัปเดตสินค้าสำเร็จ
            res.json({
              message: "Payment successful, cart cleared, and products deleted",
              totalPaid: sumPrice,
              remainingMoney: updatedMoney,
            });
          });
        });
      });
    });
  });
  
  
  
  

module.exports = router;
