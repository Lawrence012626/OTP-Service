// server.js
import bodyParser from "body-parser";
import dotenv from "dotenv";
import express from "express";
import nodemailer from "nodemailer";

dotenv.config();
const app = express();
app.use(bodyParser.json());

// SMTP transporter using env variables
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true', // false for 587, true for 465
  auth: {
    user: process.env.SMTP_USER, // capstonetrivoca@gmail.com
    pass: process.env.SMTP_PASS, // phzi oklo coqz rjcv
  },
});

// API route to send OTP
app.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000);

    // Email options
    const mailOptions = {
      from: `"TriVoca" <${process.env.SMTP_USER}>`, // Using SMTP_USER instead
      to: email,
      subject: "Your One-Time Password (OTP) Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="text-align: center; color: #333;">TriVoca</h2>
          <div style="text-align: center; margin: 20px 0;">
            <p>Dear User,</p>
            <p>You requested a one-time password (OTP) to verify your account. Please use the code below:</p>
            <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 5px; text-align: center;">
              <h1 style="color: #4285f4; font-size: 32px; margin: 0;">${otp}</h1>
            </div>
            <p>This OTP is valid for <strong>5 minutes</strong>. Do not share this code with anyone.</p>
            <p>If you didn't request this, please ignore this email or contact our support team.</p>
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="text-align: center; color: #666; font-size: 12px;">
            © ${new Date().getFullYear()} TriVoca. All rights reserved.
          </p>
        </div>
      `,
    };

    // Send email
    await transporter.sendMail(mailOptions);

    res.json({ success: true, otp }); // ⚠️ in production, wag i-send OTP pabalik
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});