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
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #4F46E5 0%, #3B82F6 50%, #0451c4 100%); border-radius: 20px; overflow: hidden;">
          <!-- Header Section -->
          <div style="text-align: center; padding: 40px 20px 30px; background: rgba(255, 255, 255, 0.1);">
            <div style="display: inline-flex; align-items: center; justify-content: center; width: 80px; height: 80px; background: #FEF1C7; border-radius: 50%; margin-bottom: 20px;">
              <div style="width: 40px; height: 40px; background: linear-gradient(45deg, #4F46E5, #3B82F6); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                <span style="color: white; font-weight: bold; font-size: 18px;">T</span>
              </div>
            </div>
            <h1 style="color: #FEF1C7; font-size: 42px; font-weight: bold; margin: 0; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">TriVoca</h1>
            <p style="color: rgba(255, 255, 255, 0.9); font-size: 16px; margin: 8px 0 0; font-weight: 500;">Language Exam Simulation and Speech Practice</p>
          </div>

          <!-- Content Section -->
          <div style="background: white; padding: 40px 30px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #4F46E5, #3B82F6); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <span style="color: white; font-size: 24px;">✉️</span>
              </div>
              <h2 style="color: #1F2937; font-size: 28px; font-weight: bold; margin: 0 0 10px;">Verify Your Email</h2>
              <p style="color: #6B7280; font-size: 16px; margin: 0; line-height: 1.5;">
                Please use the verification code below to complete your registration
              </p>
            </div>

            <!-- OTP Code Section -->
            <div style="text-align: center; margin: 40px 0;">
              <div style="background: linear-gradient(135deg, #F3F4F6, #E5E7EB); border-radius: 16px; padding: 30px; margin: 0 auto; display: inline-block; border: 2px dashed #D1D5DB;">
                <p style="color: #6B7280; font-size: 14px; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Your Verification Code</p>
                <span style="font-size: 36px; font-weight: bold; color: #0451c4; letter-spacing: 8px; font-family: 'Courier New', monospace; text-shadow: 0 2px 4px rgba(4, 81, 196, 0.2);">
                  ${otp}
                </span>
              </div>
            </div>

            <!-- Info Section -->
            <div style="background: #F8FAFC; border-radius: 12px; padding: 20px; margin: 30px 0; border-left: 4px solid #0451c4;">
              <p style="color: #374151; font-size: 14px; margin: 0 0 8px; font-weight: 600;">⏰ Important Information:</p>
              <p style="color: #6B7280; font-size: 14px; margin: 0; line-height: 1.6;">
                This verification code is valid for <strong style="color: #0451c4;">5 minutes</strong>. Do not share this code with anyone for security reasons.
              </p>
            </div>

            <div style="text-align: center; margin-top: 30px;">
              <p style="color: #9CA3AF; font-size: 14px; line-height: 1.6; margin: 0;">
                If you didn't request this verification code, please ignore this email or contact our support team.
              </p>
            </div>

            <!-- Call to Action -->
            <div style="text-align: center; margin: 30px 0;">
              <div style="background: linear-gradient(135deg, #4F46E5, #0451c4); color: white; padding: 15px 30px; border-radius: 50px; display: inline-block; font-weight: 600; font-size: 16px;">
                🚀 Get Started with TriVoca
              </div>
            </div>
          </div>

          <!-- Footer Section -->
          <div style="background: #1F2937; padding: 30px; text-align: center;">
            <p style="color: #9CA3AF; font-size: 14px; margin: 0 0 10px;">
              Fluency in Korean, Chinese, and Japanese starts here.
            </p>
            <div style="border-top: 1px solid #374151; margin: 20px 0; padding-top: 20px;">
              <p style="color: #6B7280; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} TriVoca. All rights reserved.
              </p>
            </div>
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