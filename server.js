// server.js
import bodyParser from "body-parser";
import dotenv from "dotenv";
import express from "express";
import admin from 'firebase-admin';
import nodemailer from "nodemailer";

dotenv.config();
const app = express();
app.use(bodyParser.json());

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

// In-memory OTP storage (use Redis or database in production)
const otpStore = new Map();
const verifiedOTPs = new Map(); // For password reset verification tracking

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

// SVG Icons
const icons = {
  celebration: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5.5 2L2 8.5L8.5 5.5L5.5 2Z" fill="#f59e0b" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M18.5 2L22 8.5L15.5 5.5L18.5 2Z" fill="#f59e0b" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M12 2V8" stroke="#1e3a8a" stroke-width="2" stroke-linecap="round"/>
    <circle cx="12" cy="12" r="8" stroke="#1e3a8a" stroke-width="2" fill="#dbeafe"/>
    <path d="M8 11C8.5 11.5 9.5 12 12 12C14.5 12 15.5 11.5 16 11" stroke="#1e3a8a" stroke-width="2" stroke-linecap="round"/>
    <circle cx="9" cy="10" r="1" fill="#1e3a8a"/>
    <circle cx="15" cy="10" r="1" fill="#1e3a8a"/>
  </svg>`,
  
  lock: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="11" width="14" height="11" rx="2" stroke="#1e3a8a" stroke-width="2" fill="#dbeafe"/>
    <path d="M7 11V7C7 4.23858 9.23858 2 12 2C14.7614 2 17 4.23858 17 7V11" stroke="#1e3a8a" stroke-width="2" stroke-linecap="round"/>
    <circle cx="12" cy="16" r="2" fill="#f59e0b"/>
    <path d="M12 18V20" stroke="#f59e0b" stroke-width="2" stroke-linecap="round"/>
  </svg>`,
  
  checkCircle: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" fill="#10b981"/>
    <path d="M8 12L11 15L16 9" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  
  warning: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 20H22L12 2Z" fill="#f59e0b" stroke="#92400e" stroke-width="2" stroke-linejoin="round"/>
    <path d="M12 9V13" stroke="#92400e" stroke-width="2" stroke-linecap="round"/>
    <circle cx="12" cy="17" r="1" fill="#92400e"/>
  </svg>`
};

// Email template for REGISTRATION - WELCOME MESSAGE
function getRegistrationEmailTemplate(otp) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <!-- Header Section - Blue Background with Banner -->
      <div style="padding: 50px 20px; background: #1d3c73;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="https://drive.google.com/uc?export=download&id=1ZalJhyMjDSewz6jWt2GaJYJcmuvIe7iO" alt="TriVoca Banner" style="max-width: 100%; height: auto;">
        </div>
        <div style="text-align: center;">
          <p style="color: white; font-size: 16px; margin: 0; font-weight: 400; letter-spacing: 0.5px;">Language Proficiency Exam Simulator</p>
        </div>
      </div>

      <!-- Content Section -->
      <div style="background: white; padding: 40px 30px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="display: inline-block; background: #dbeafe; border-radius: 50%; padding: 20px; margin-bottom: 20px;">
            ${icons.celebration}
          </div>
          <h2 style="color: #1e3a8a; font-size: 28px; font-weight: 700; margin: 0 0 15px;">Welcome to TriVoca!</h2>
          <p style="color: #64748b; font-size: 16px; margin: 0; line-height: 1.6;">
            You're just one step away from starting your language proficiency journey.
          </p>
        </div>

        <!-- OTP Code Section -->
        <div style="text-align: center; margin: 30px 0;">
          <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border-radius: 16px; padding: 30px; margin: 0 auto; border: 3px solid #1e3a8a; box-shadow: 0 4px 12px rgba(30, 58, 138, 0.15);">
            <p style="color: #1e3a8a; font-size: 16px; margin: 0 0 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Your Verification Code:</p>
            <span style="font-size: 36px; font-weight: bold; color: #f59e0b; letter-spacing: 8px; font-family: 'Courier New', monospace; text-shadow: 2px 2px 4px rgba(0,0,0,0.1);">
              ${otp}
            </span>
          </div>
        </div>

        <!-- Info Section -->
        <div style="background: #eff6ff; border-radius: 12px; padding: 20px; margin: 30px 0; border-left: 4px solid #f59e0b;">
          <p style="color: #1e3a8a; font-size: 14px; margin: 0; line-height: 1.8; font-weight: 500;">
            <span style="display: inline-block; vertical-align: middle; margin-right: 8px;">${icons.checkCircle}</span> Code expires in <strong style="color: #f59e0b;">5 minutes</strong><br>
            <span style="display: inline-block; vertical-align: middle; margin-right: 8px;">${icons.checkCircle}</span> Use this code to complete your registration<br>
            <span style="display: inline-block; vertical-align: middle; margin-right: 8px;">${icons.checkCircle}</span> Never share this code with anyone
          </p>
        </div>

        <div style="text-align: center; margin-top: 30px;">
          <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0;">
            If you didn't create this account, please ignore this email.
          </p>
        </div>
      </div>

      <!-- Footer Section -->
      <div style="background: #f8fafc; padding: 25px; text-align: center; border-top: 2px solid #e2e8f0;">
        <p style="color: #64748b; font-size: 12px; margin: 0; font-weight: 500;">
          © ${new Date().getFullYear()} TriVoca Entry Level. All rights reserved.
        </p>
      </div>
    </div>
  `;
}

// Email template for PASSWORD RESET - MODERN DESIGN
function getPasswordResetEmailTemplate(otp) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <!-- Header Section - Blue Background with Banner -->
      <div style="padding: 50px 20px; background: #1d3c73;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="https://drive.google.com/uc?export=download&id=1ZalJhyMjDSewz6jWt2GaJYJcmuvIe7iO" alt="TriVoca Banner" style="max-width: 100%; height: auto;">
        </div>
      </div>

      <!-- Content Section -->
      <div style="background: white; padding: 40px 30px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="display: inline-block; background: #dbeafe; border-radius: 50%; padding: 20px; margin-bottom: 20px;">
            ${icons.lock}
          </div>
          <h2 style="color: #1e3a8a; font-size: 28px; font-weight: 700; margin: 0 0 15px;">Password Reset Request</h2>
          <p style="color: #64748b; font-size: 16px; margin: 0; line-height: 1.6;">
            We received a request to reset your password. Enter the code below to continue.
          </p>
        </div>

        <!-- OTP Code Section -->
        <div style="text-align: center; margin: 30px 0;">
          <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border-radius: 16px; padding: 30px; margin: 0 auto; border: 3px solid #1e3a8a; box-shadow: 0 4px 12px rgba(30, 58, 138, 0.15);">
            <p style="color: #1e3a8a; font-size: 16px; margin: 0 0 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Your Verification Code:</p>
            <span style="font-size: 36px; font-weight: bold; color: #f59e0b; letter-spacing: 8px; font-family: 'Courier New', monospace; text-shadow: 2px 2px 4px rgba(0,0,0,0.1);">
              ${otp}
            </span>
          </div>
        </div>

        <!-- Security Warning -->
        <div style="background: #fff7ed; border-radius: 12px; padding: 20px; margin: 30px 0; border-left: 4px solid #f59e0b;">
          <p style="color: #92400e; font-size: 15px; margin: 0 0 10px; font-weight: 700;">
            <span style="display: inline-block; vertical-align: middle; margin-right: 8px;">${icons.warning}</span> Security Notice
          </p>
          <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.8; font-weight: 500;">
            <span style="display: inline-block; vertical-align: middle; margin-right: 8px;">${icons.checkCircle}</span> Code expires in <strong style="color: #f59e0b;">5 minutes</strong><br>
            <span style="display: inline-block; vertical-align: middle; margin-right: 8px;">${icons.checkCircle}</span> Only use this code if you requested a password reset<br>
            <span style="display: inline-block; vertical-align: middle; margin-right: 8px;">${icons.checkCircle}</span> Never share this code with anyone<br>
            <span style="display: inline-block; vertical-align: middle; margin-right: 8px;">${icons.checkCircle}</span> If you didn't request this, please secure your account immediately
          </p>
        </div>

        <div style="text-align: center; margin-top: 30px;">
          <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0;">
            Didn't request a password reset? You can safely ignore this email.
          </p>
        </div>
      </div>

      <!-- Footer Section -->
      <div style="background: #f8fafc; padding: 25px; text-align: center; border-top: 2px solid #e2e8f0;">
        <p style="color: #64748b; font-size: 12px; margin: 0; font-weight: 500;">
          © ${new Date().getFullYear()} TriVoca Entry Level. All rights reserved.
        </p>
      </div>
    </div>
  `;
}

// API route to send OTP
app.post("/send-otp", async (req, res) => {
  try {
    const { email, type } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Validate type parameter
    const otpType = type === 'reset' ? 'reset' : 'registration';

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP with expiration (5 minutes)
    const expiresAt = Date.now() + 5 * 60 * 1000;
    otpStore.set(email.toLowerCase(), {
      otp: otp,
      expiresAt: expiresAt,
      attempts: 0,
      type: otpType
    });

    console.log(`OTP for ${email} (${otpType}): ${otp}`);

    // Get appropriate email template and subject based on type
    const htmlTemplate = otpType === 'reset' 
      ? getPasswordResetEmailTemplate(otp)
      : getRegistrationEmailTemplate(otp);

    const subject = otpType === 'reset'
      ? "Password Reset Request - Verification Code"
      : "Welcome to TriVoca - Verify Your Email";

    // Email options
    const mailOptions = {
      from: `"TriVoca" <${process.env.SMTP_USER}>`,
      to: email,
      subject: subject,
      html: htmlTemplate,
    };

    // Send email
    await transporter.sendMail(mailOptions);

    res.json({ 
      success: true, 
      message: `OTP sent successfully for ${otpType}`,
      type: otpType
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

    // OTP is valid - mark as verified for password reset (5 minutes validity)
    verifiedOTPs.set(emailKey, {
      verified: true,
      timestamp: Date.now(),
      expiresAt: Date.now() + (5 * 60 * 1000)
    });

    // Remove from OTP store
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

// Reset password endpoint
app.post("/reset-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Email and new password are required'
      });
    }

    const emailKey = email.toLowerCase();

    // Check if OTP was verified
    const verification = verifiedOTPs.get(emailKey);
    
    if (!verification) {
      return res.status(400).json({
        success: false,
        error: 'OTP not verified. Please verify OTP first.'
      });
    }

    if (Date.now() > verification.expiresAt) {
      verifiedOTPs.delete(emailKey);
      return res.status(400).json({
        success: false,
        error: 'Verification expired. Please request a new OTP.'
      });
    }

    // Validate password
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }

    // Get user by email
    const userRecord = await admin.auth().getUserByEmail(email);
    
    if (!userRecord) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update password using Firebase Admin SDK
    await admin.auth().updateUser(userRecord.uid, {
      password: newPassword
    });

    // Clean up verification
    verifiedOTPs.delete(emailKey);

    console.log(`Password reset successful for: ${email}`);

    res.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    
    let errorMessage = 'Failed to reset password';
    
    if (error.code === 'auth/user-not-found') {
      errorMessage = 'User not found';
    } else if (error.code === 'auth/invalid-password') {
      errorMessage = 'Invalid password format';
    }

    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    status: "OK",
    message: "OTP service is running",
    timestamp: new Date().toISOString(),
    endpoints: {
      sendOTP: 'POST /send-otp (with type: "registration" or "reset")',
      verifyOTP: 'POST /verify-otp',
      resetPassword: 'POST /reset-password'
    }
  });
});

// Clean up expired OTPs and verifications every 5 minutes
setInterval(() => {
  const now = Date.now();
  
  // Clean expired OTPs
  for (const [email, data] of otpStore.entries()) {
    if (now > data.expiresAt) {
      otpStore.delete(email);
      console.log(`Cleaned up expired OTP for ${email}`);
    }
  }
  
  // Clean expired verifications
  for (const [email, data] of verifiedOTPs.entries()) {
    if (now > data.expiresAt) {
      verifiedOTPs.delete(email);
      console.log(`Cleaned up expired verification for ${email}`);
    }
  }
}, 5 * 60 * 1000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📧 SMTP configured for: ${process.env.SMTP_USER}`);
  console.log(`🔥 Firebase Admin initialized`);
});
