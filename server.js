// server.js
import bodyParser from "body-parser";
import dotenv from "dotenv";
import express from "express";
import nodemailer from "nodemailer";

dotenv.config();
const app = express();
app.use(bodyParser.json());

// In-memory OTP storage (use Redis or database in production)
const otpStore = new Map();

// Gmail transporter (with App Password)
const transporter = nodemailer.createTransport({
  service: 'gmail',
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
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP with expiration (5 minutes)
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes from now
    otpStore.set(email.toLowerCase(), {
      otp: otp,
      expiresAt: expiresAt,
      attempts: 0
    });

    console.log(`OTP for ${email}: ${otp}`); // For debugging - remove in production

    // Email options
    const mailOptions = {
      from: `"Trivoca" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Your One-Time Password (OTP) Code",
      attachments: [
        {
          filename: 'logo.png',
          path: './logo.png', // Path to your logo file
          cid: 'logo' // Content ID for embedding in HTML
        }
      ],
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; border: 1px solid #E5E7EB;">
          <!-- Header Section -->
          <div style="padding: 40px 20px 30px; background: #F8FAFC;">
            <!-- Logo and Title Side by Side -->
            <div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 10px;">
              <img src="cid:logo" alt="Trivoca Logo" style="height: 60px; width: auto;">
              <div style="text-align: left;">
                <h1 style="color: #1F2937; font-size: 32px; font-weight: bold; margin: 0; line-height: 1.1;">Trivoca Entry</h1>
                <h1 style="color: #1F2937; font-size: 32px; font-weight: bold; margin: 0; line-height: 1.1;">Level</h1>
              </div>
            </div>
            <div style="text-align: center;">
              <p style="color: #6B7280; font-size: 16px; margin: 0; font-weight: 400;">Language Proficiency Exam Simulator</p>
            </div>
          </div>

          <!-- Content Section -->
          <div style="background: white; padding: 40px 30px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h2 style="color: #1F2937; font-size: 24px; font-weight: 600; margin: 0 0 15px;">Verify Your Email</h2>
              <p style="color: #6B7280; font-size: 16px; margin: 0; line-height: 1.5;">
                Please use the verification code below to complete your registration.
              </p>
            </div>

            <!-- OTP Code Section -->
            <div style="text-align: center; margin: 30px 0;">
              <div style="background: #F8FAFC; border-radius: 8px; padding: 25px; margin: 0 auto; border: 1px solid #E5E7EB;">
                <p style="color: #374151; font-size: 16px; margin: 0 0 10px; font-weight: 600;">Verification Code:</p>
                <span style="font-size: 28px; font-weight: bold; color: #1F2937; letter-spacing: 4px; font-family: 'Courier New', monospace;">
                  ${otp}
                </span>
              </div>
            </div>

            <!-- Important Note Section -->
            <div style="background: #FEF3C7; border-radius: 8px; padding: 20px; margin: 30px 0; border: 1px solid #FDE68A;">
              <p style="color: #92400E; font-size: 16px; margin: 0 0 8px; font-weight: 600;">Important Note</p>
              <p style="color: #92400E; font-size: 14px; margin: 0; line-height: 1.6;">
                This verification code is valid for <strong>5 Minutes</strong>. Do not share this code with anyone for security reasons.
              </p>
            </div>

            <div style="text-align: center; margin-top: 30px;">
              <p style="color: #9CA3AF; font-size: 14px; line-height: 1.6; margin: 0;">
                If you didn't request this verification code, please ignore this email.
              </p>
            </div>
          </div>

          <!-- Footer Section -->
          <div style="background: #F8FAFC; padding: 20px; text-align: center; border-top: 1px solid #E5E7EB;">
            <p style="color: #6B7280; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} Trivoca Entry Level. All rights reserved.
            </p>
          </div>
        </div>
      `,
    };

    // Send email
    await transporter.sendMail(mailOptions);

    res.json({ 
      success: true, 
      message: "OTP sent successfully"
    }); 
  } catch (error) {
    console.error("Email sending error:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to send OTP" 
    });
  }
});

// API route to verify OTP
app.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ 
        success: false,
        message: "Email and OTP are required" 
      });
    }

    const emailKey = email.toLowerCase();
    const storedData = otpStore.get(emailKey);

    if (!storedData) {
      return res.status(400).json({ 
        success: false,
        message: "OTP not found. Please request a new OTP." 
      });
    }

    // Check if OTP has expired
    if (Date.now() > storedData.expiresAt) {
      otpStore.delete(emailKey);
      return res.status(400).json({ 
        success: false,
        message: "OTP has expired. Please request a new OTP." 
      });
    }

    // Check attempt limit (max 3 attempts)
    if (storedData.attempts >= 3) {
      otpStore.delete(emailKey);
      return res.status(400).json({ 
        success: false,
        message: "Too many failed attempts. Please request a new OTP." 
      });
    }

    // Verify OTP
    if (storedData.otp !== otp.toString()) {
      storedData.attempts += 1;
      otpStore.set(emailKey, storedData);
      
      return res.status(400).json({ 
        success: false,
        message: `Invalid OTP. ${3 - storedData.attempts} attempts remaining.` 
      });
    }

    // OTP is valid - remove from store and return success
    otpStore.delete(emailKey);
    
    console.log(`OTP verified successfully for ${email}`);
    
    res.json({ 
      success: true,
      message: "OTP verified successfully" 
    });

  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to verify OTP" 
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    status: "OK",
    message: "OTP service is running",
    timestamp: new Date().toISOString()
  });
});

// Clean up expired OTPs every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [email, data] of otpStore.entries()) {
    if (now > data.expiresAt) {
      otpStore.delete(email);
      console.log(`Cleaned up expired OTP for ${email}`);
    }
  }
}, 5 * 60 * 1000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📧 SMTP configured for: ${process.env.SMTP_USER}`);
});