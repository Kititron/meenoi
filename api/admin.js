const express = require("express");
const db = require("../dbconnect");
const router = express.Router();

router.use(express.json());
router.use(express.urlencoded({ extended: true }));

router.get("/", (req, res) => {
    const sql = "select * from product"; // คำสั่ง SQL เพื่อดึงข้อมูลจากตาราง user
    db.query(sql, (err, results) => {
      if (err) {
        console.error("Error executing query:", err);
        return res.status(500).send("Error fetching data from user table");
      }
      res.json(results); // ส่งข้อมูลที่ดึงมาในรูปแบบ JSONgit branch -r
    });
  });

router.get("/add", (req, res) => {
    const numbers = [];
    const today = new Date();
    const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)).toISOString().split('T')[0];

    // Generate 20 random numbers
    for (let i = 0; i < 100; i++) {
        const number = Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;
        numbers.push([number, date]);
    }

    const sql = "INSERT INTO product (number, date) VALUES ?"; // SQL query for bulk insert

    db.query(sql, [numbers], (err, result) => {
        if (err) {
            console.error("Error executing query:", err);
            return res.status(500).send("Error inserting data into product table");
        }
        res.status(201).send(`Successfully inserted ${result.affectedRows} rows`);
    });
});

router.delete("/delete", (req, res) => {
    const sql = "DELETE FROM product"; // SQL query to delete all records

    db.query(sql, (err, result) => {
        if (err) {
            console.error("Error executing query:", err);
            return res.status(500).send("Error deleting data from product table");
        }

        // Now reset the AUTO_INCREMENT value
        const resetSql = "ALTER TABLE product AUTO_INCREMENT = 1";
        db.query(resetSql, (err, resetResult) => {
            if (err) {
                console.error("Error resetting AUTO_INCREMENT:", err);
                return res.status(500).send("Error resetting AUTO_INCREMENT");
            }
            res.status(200).send(`Successfully deleted ${result.affectedRows} rows and reset AUTO_INCREMENT`);
        });
    });
});

router.get("/random", (req, res) => {
    // ดึงข้อมูล id และ number ทั้งหมดจากตาราง product
    const sql = "SELECT id, number FROM product"; // คำสั่ง SQL เพื่อดึง id และ number
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Error executing query:", err);
            return res.status(500).send("Error fetching data from product table");
        }

        // ตรวจสอบว่ามีข้อมูลในฐานข้อมูลหรือไม่
        if (results.length === 0) {
            return res.status(404).send("No products found");
        }

        // สุ่ม 5 ผลลัพธ์จากข้อมูล
        const shuffled = results.sort(() => 0.5 - Math.random()); // สุ่มเรียงลำดับ
        const selectedProducts = shuffled.slice(0, 5); // เลือก 5 ผลลัพธ์แรกหลังจากสุ่ม

        res.json(selectedProducts); // ส่งผลลัพธ์กลับไปในรูปแบบ JSON
    });
});

router.post("/rank", (req, res) => {
    const rewards = req.body.rewards;

    // แปลง id ที่เป็น string ให้เป็น int
    const rewardIds = rewards.map(reward => parseInt(reward.id, 10));
    console.log(rewardIds);

    if (!rewardIds || rewardIds.length !== 5) {
      return res.status(400).send("Invalid request. 5 rewards are required.");
    }

    // ขั้นตอนที่ 1: รีเซ็ตค่า status ในตาราง product ทั้งหมดให้เป็น NULL ก่อน
    const resetSql = "UPDATE product SET status = NULL";

    db.query(resetSql, (err, result) => {
      if (err) {
        console.error("Error resetting product status:", err);
        return res.status(500).send("Error resetting product status.");
      }

      // ขั้นตอนที่ 2: หลังจากรีเซ็ตค่าเสร็จแล้ว ทำการอัปเดต status ใหม่ตามที่ได้รับมา
      const updateSql = `UPDATE product SET status = CASE id
        WHEN ? THEN 1
        WHEN ? THEN 2
        WHEN ? THEN 3
        WHEN ? THEN 4
        WHEN ? THEN 5
        END
        WHERE id IN (?, ?, ?, ?, ?)`;

      db.query(updateSql, [...rewardIds, ...rewardIds], (err, result) => {
        if (err) {
          console.error("Error executing query:", err);
          return res.status(500).send("Error updating product status.");
        }

        res.send("Product status updated successfully.");
      });
    });
});

  
  // API สำหรับลบข้อมูลในตาราง user ยกเว้น admin
router.delete("/reset", (req, res) => {
    // SQL Query สำหรับลบข้อมูลในตาราง user ที่ user type ไม่ใช่ admin
    let sql = "DELETE FROM user WHERE type != 'admin'";
  
    db.query(sql, (error, result) => {
      if (error) {
        console.error("Error deleting data:", error);
        return res.status(500).json({
          status: false,
          message: "Failed to reset data",
        });
      }
  
      // ส่งผลลัพธ์กลับเมื่อทำการลบสำเร็จ
      res.json({
        status: true,
        message: "Data has been reset successfully",
      });
    });
  });

  
  router.delete("/deleteCart", (req, res) => {
    const sql = "DELETE FROM cart"; // คำสั่ง SQL เพื่อลบข้อมูลทั้งหมดในตาราง cart
    db.query(sql, (err, results) => {
      if (err) {
        console.error("Error executing query:", err);
        return res.status(500).send("Error deleting data from cart table");
      }
      res.send("All data from cart table has been deleted successfully");
    });
  });
  

  router.get("/rewardo", (req, res) => {
    // ดึงข้อมูล id และ number ทั้งหมดจากตาราง product
    const sql = "SELECT id, number FROM product"; // คำสั่ง SQL เพื่อดึง id และ number
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Error executing query:", err);
            return res.status(500).send("Error fetching data from product table");
        }

        // ตรวจสอบว่ามีข้อมูลในฐานข้อมูลหรือไม่
        if (results.length === 0) {
            return res.status(404).send("No products found");
        }

        // สุ่ม 5 ผลลัพธ์จากข้อมูล
        const shuffled = results.sort(() => 0.5 - Math.random()); // สุ่มเรียงลำดับ
        const selectedProducts = shuffled.slice(0, 5); // เลือก 5 ผลลัพธ์แรกหลังจากสุ่ม

        // สร้าง array ของ id ที่สุ่มได้มา
        const selectedIds = selectedProducts.map(product => product.id);

        // ขั้นตอนที่ 1: รีเซ็ตค่า status ในตาราง product ทั้งหมดให้เป็น NULL ก่อน
        const resetSql = "UPDATE product SET status = NULL";

        db.query(resetSql, (err, result) => {
            if (err) {
                console.error("Error resetting product status:", err);
                return res.status(500).send("Error resetting product status.");
            }

            // ขั้นตอนที่ 2: หลังจากรีเซ็ตค่าเสร็จแล้ว ทำการอัปเดต status ใหม่ตามที่สุ่มได้
            const updateSql = `UPDATE product SET status = CASE 
                WHEN id = ? THEN 1
                WHEN id = ? THEN 2
                WHEN id = ? THEN 3
                WHEN id = ? THEN 4
                WHEN id = ? THEN 5
                END
                WHERE id IN (?, ?, ?, ?, ?)`;

            db.query(updateSql, [...selectedIds, ...selectedIds], (err, result) => {
                if (err) {
                    console.error("Error updating product status:", err);
                    return res.status(500).send("Error updating product status.");
                }

                // ส่งผลลัพธ์กลับในรูปแบบ JSON
                res.json({
                    message: "Selected products have been randomized and product status updated successfully",
                    selectedProducts: selectedProducts
                });
            });
        });
    });
});



router.post("/executeAll", (req, res) => {
    // Step 1: Delete all records from product table and reset AUTO_INCREMENT
    const deleteProductSql = "DELETE FROM product";
    db.query(deleteProductSql, (err, result) => {
        if (err) {
            console.error("Error deleting product data:", err);
            return res.status(500).send("Error deleting data from product table");
        }
        const resetProductSql = "ALTER TABLE product AUTO_INCREMENT = 1";
        db.query(resetProductSql, (err, resetResult) => {
            if (err) {
                console.error("Error resetting AUTO_INCREMENT:", err);
                return res.status(500).send("Error resetting AUTO_INCREMENT");
            }

            // Step 2: Delete all records from cart table
            const deleteCartSql = "DELETE FROM cart";
            db.query(deleteCartSql, (err, results) => {
                if (err) {
                    console.error("Error deleting cart data:", err);
                    return res.status(500).send("Error deleting data from cart table");
                }

                // Step 3: Insert 100 new records into the product table
                const numbers = [];
                const today = new Date();
                const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)).toISOString().split('T')[0];
                for (let i = 0; i < 100; i++) {
                    const number = Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;
                    numbers.push([number, date]);
                }
                const insertProductSql = "INSERT INTO product (number, date) VALUES ?";
                db.query(insertProductSql, [numbers], (err, result) => {
                    if (err) {
                        console.error("Error inserting product data:", err);
                        return res.status(500).send("Error inserting data into product table");
                    }

                    // Step 4: Randomly update status for 5 products
                    const selectProductSql = "SELECT id, number FROM product";
                    db.query(selectProductSql, (err, results) => {
                        if (err) {
                            console.error("Error fetching product data:", err);
                            return res.status(500).send("Error fetching data from product table");
                        }
                        if (results.length === 0) {
                            return res.status(404).send("No products found");
                        }

                        const shuffled = results.sort(() => 0.5 - Math.random());
                        const selectedProducts = shuffled.slice(0, 5);
                        const selectedIds = selectedProducts.map(product => product.id);

                        const resetStatusSql = "UPDATE product SET status = NULL";
                        db.query(resetStatusSql, (err, result) => {
                            if (err) {
                                console.error("Error resetting product status:", err);
                                return res.status(500).send("Error resetting product status.");
                            }

                            const updateStatusSql = `UPDATE product SET status = CASE 
                                WHEN id = ? THEN 1
                                WHEN id = ? THEN 2
                                WHEN id = ? THEN 3
                                WHEN id = ? THEN 4
                                WHEN id = ? THEN 5
                                END
                                WHERE id IN (?, ?, ?, ?, ?)`;

                            db.query(updateStatusSql, [...selectedIds, ...selectedIds], (err, result) => {
                                if (err) {
                                    console.error("Error updating product status:", err);
                                    return res.status(500).send("Error updating product status.");
                                }

                                // Step 5: Delete all users except admin
                                const deleteUserSql = "DELETE FROM user WHERE type != 'admin'";
                                db.query(deleteUserSql, (err, result) => {
                                    if (err) {
                                        console.error("Error deleting user data:", err);
                                        return res.status(500).send("Error deleting data from user table");
                                    }

                                    // If everything succeeded
                                    res.status(200).send("All operations completed successfully.");
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});





module.exports = router;
