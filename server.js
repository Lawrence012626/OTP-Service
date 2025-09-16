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
        <!-- Import Google Font -->
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
        
        <div style="position: relative; font-family: 'Poppins', Arial, sans-serif; max-width: 450px; margin: 0 auto; padding: 30px 25px; background: #ffffff; border-radius: 15px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden;">
          <!-- Circle Decorations -->
          <div style="position: absolute; top: -50px; right: -50px; width: 120px; height: 120px; background: #8B9DC3; border-radius: 50%; opacity: 0.7;"></div>
          <div style="position: absolute; bottom: -60px; left: -60px; width: 140px; height: 140px; background: #8B9DC3; border-radius: 50%; opacity: 0.6;"></div>
          
          <!-- Header (Logo + Text Side by Side) -->
          <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 35px; position: relative; z-index: 2;">
            <img src="cid:logo" alt="Trivoca Logo" style="height: 90px; width: auto;">
            <div>
              <h2 style="color: #F59E0B; font-size: 28px; margin: 0; font-weight: 700; line-height: 1.1;">Trivoca Entry Level</h2>
              <p style="color: #6B7280; font-size: 14px; margin: 4px 0 0; line-height: 1.3; font-weight: 500;">
                Language Proficiency<br>Exam Simulator
              </p>
            </div>
          </div>
          
          <!-- Verify Section -->
          <div style="text-align: center; margin: 35px 0; position: relative; z-index: 2;">
            <h3 style="color: #1F2937; font-size: 26px; font-weight: 700; margin-bottom: 12px; letter-spacing: -0.5px;">Verify Your Email</h3>
            <p style="color: #6B7280; font-size: 16px; margin: 0; line-height: 1.5; font-weight: 400;">
              Please use the verification code below to complete your registration.
            </p>
          </div>
          
          <!-- Verification Code -->
          <div style="text-align: center; margin: 35px 0; position: relative; z-index: 2;">
            <div style="background: linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%); border-radius: 12px; padding: 25px 20px; box-shadow: 0 4px 15px rgba(30, 58, 138, 0.2);">
              <p style="color: #ffffff; font-size: 16px; margin: 0 0 15px; letter-spacing: 2px; text-transform: uppercase; font-weight: 600;">
                VERIFICATION CODE:
              </p>
              <div style="font-size: 32px; font-weight: 700; color: #F59E0B; letter-spacing: 8px; font-family: 'Poppins', monospace; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                $ { ${otp} }
              </div>
            </div>
          </div>
          
          <!-- Important Note -->
          <div style="text-align: center; margin-top: 35px; position: relative; z-index: 2;">
            <h4 style="color: #1F2937; font-size: 18px; font-weight: 700; margin-bottom: 10px;">Important Note</h4>
            <p style="color: #6B7280; font-size: 15px; margin: 0; line-height: 1.6; font-weight: 400;">
              This verification code is valid for <strong style="color: #1F2937;">5 Minutes</strong>.<br>
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