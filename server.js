// server.js
import bodyParser from "body-parser";
import dotenv from "dotenv";
import express from "express";
import nodemailer from "nodemailer";

dotenv.config();
const app = express();
app.use(bodyParser.json());

// Gmail transporter (with App Password) - FIXED VERSION
const transporter = nodemailer.createTransporter({
  service: 'gmail', // Add this line to specify Gmail service
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER, 
    pass: process.env.SMTP_PASS, 
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

    // Email options - FIXED VERSION with proper sender name
    const mailOptions = {
      from: `"Trivoca" <${process.env.SMTP_USER}>`, // This ensures sender name shows as "Trivoca"
      to: email,
      subject: "Your One-Time Password (OTP) Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border-radius: 10px; background: #f9f9f9; border: 1px solid #ddd;">
          <h2 style="text-align: center; color: #333;">Trivoca</h2>
          <p style="font-size: 15px; color: #555;">
            Dear User,
          </p>
          <p style="font-size: 15px; color: #555;">
            You requested a one-time password (OTP) to verify your account. Please use the code below:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; color: #1E4D9B; letter-spacing: 4px;">
              ${otp}
            </span>
          </div>
          <p style="font-size: 14px; color: #555;">
            This OTP is valid for <strong>5 minutes</strong>. Do not share this code with anyone.
          </p>
          <p style="font-size: 14px; color: #555;">
            If you didn't request this, please ignore this email or contact our support team.
          </p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
          <p style="font-size: 12px; color: #888; text-align: center;">
            © ${new Date().getFullYear()} Trivoca. All rights reserved.
          </p>
        </div>
      `,
    };

    // Send email
    await transporter.sendMail(mailOptions);

    res.json({ 
      success: true, 
      message: "OTP sent successfully",
      // otp // ⚠️ Remove this in production - don't send OTP back to client
    }); 
  } catch (error) {
    console.error("Email sending error:", error);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});