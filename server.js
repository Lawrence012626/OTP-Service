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
        },
        {
          filename: 'bubble.jpg',
          path: './bubble.jpg', // Path to your circle decoration
          cid: 'circle' // Content ID for embedding in HTML
        }
      ],
      html: `
        <!-- Import Google Font -->
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
        
        <div style="position: relative; font-family: 'Poppins', Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px; background: #ffffff; border-radius: 10px; border: 1px solid #e5e7eb; overflow: hidden;">
          <!-- Circle Decorations -->
          <img src="cid:circle" alt="circle" style="position: absolute; top: -30px; right: -30px; width: 100px; opacity: 0.8;">
          <img src="cid:circle" alt="circle" style="position: absolute; bottom: 40px; left: -40px; width: 120px; opacity: 0.8;">
          
          <!-- Header (Logo + Text Side by Side) -->
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 25px; position: relative; z-index: 1;">
            <img src="cid:logo" alt="TriVoca Logo" style="height: 100px;">
            <div>
              <h2 style="color: #F59E0B; font-size: 25px; margin: 0; font-weight: 700;">Trivoca Entry Level</h2>
              <p style="color: #374151; font-size: 13px; margin: 2px 0 0; line-height: 1.4;">
                Language Proficiency<br>Exam Simulator
              </p>
            </div>
          </div>
          
          <!-- Verify Section -->
          <div style="text-align: center; margin: 25px 0; position: relative; z-index: 1;">
            <h3 style="color: #111827; font-size: 20px; font-weight: 700; margin-bottom: 10px;">Verify Your Email</h3>
            <p style="color: #6B7280; font-size: 14px; margin: 0;">
              Please use the verification code below to complete your registration.
            </p>
          </div>
          
          <!-- Verification Code -->
          <div style="text-align: center; margin: 25px 0; position: relative; z-index: 1;">
            <div style="background: #1E3A8A; border-radius: 8px; padding: 20px;">
              <p style="color: #ffffff; font-size: 14px; margin: 0 0 10px; letter-spacing: 1px; text-transform: uppercase; font-weight: 600;">
                Verification Code:
              </p>
              <span style="font-size: 28px; font-weight: 700; color: #F59E0B; letter-spacing: 10px; font-family: 'Poppins', monospace;">
                ${otp}
              </span>
            </div>
          </div>
          
          <!-- Important Note -->
          <div style="text-align: center; margin-top: 20px; position: relative; z-index: 1;">
            <h4 style="color: #111827; font-size: 14px; font-weight: 700; margin-bottom: 8px;">Important Note</h4>
            <p style="color: #6B7280; font-size: 13px; margin: 0; line-height: 1.5;">
              This verification code is valid for <b>5 Minutes</b>.<br>
              Do not share this code with anyone for security reasons.
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