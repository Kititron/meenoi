const express = require("express");
const mysql = require("mysql");
const http = require("http");
const app = require("./app");

const port = process.env.port || 3000;
const server = http.createServer(app);

// server.listen(port, () => {
//   console.log(`Server is running on http://localhost:${port}`);
// });


function handleResponse(
  res,
  err,
  data,
  notFoundStatusCode = 404,
  notFoundMessage = "Not found",
  changes = null
) {
  if (err) {
    res.status(500).json({ error: err.message });
    return;
  }
  if (!data && !changes) {
    res.status(notFoundStatusCode).json({ error: notFoundMessage });
    return;
  }
  res.json(data);
}

var os = require("os");
var ip = "0.0.0.0";
var ips = os.networkInterfaces();
Object.keys(ips).forEach(function (_interface) {
  ips[_interface].forEach(function (_dev) {
    if (_dev.family === "IPv4" && !_dev.internal) ip = _dev.address;
  });
});

// ใช้ server.listen แทน app.listen
server.listen(port, () => {
  console.log(`Lotto BackEnd API at http://${ip}:${port}`);
});

// เชื่อมต่อกับฐานข้อมูล
// db.connect((err) => {
//   if (err) {
//     console.error('Error connecting to the database:', err);
//     return;
//   }
//   console.log('Connected to the database.');
// });

// รันเซิร์ฟเวอร์
// const port = 3000;
// app.listen(port, () => {
//   console.log(`Server is running on http://localhost:${port}`);
// });
