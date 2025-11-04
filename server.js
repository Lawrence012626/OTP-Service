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
          <div style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%); border-radius: 50%; width: 80px; height: 80px; line-height: 80px; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(30, 58, 138, 0.3);">
            <span style="font-size: 40px; color: white;">&#10003;</span>
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
        <div style="background: #eff6ff; border-radius: 12px; padding: 20px; margin: 30px 0; border-left: 4px solid #3b82f6;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td style="padding: 5px 0;">
                <span style="display: inline-block; width: 20px; height: 20px; background: #10b981; border-radius: 50%; text-align: center; line-height: 20px; color: white; font-size: 12px; font-weight: bold; margin-right: 10px; vertical-align: middle;">&#10003;</span>
                <span style="color: #1e3a8a; font-size: 14px; font-weight: 500; vertical-align: middle;">Code expires in <strong style="color: #f59e0b;">5 minutes</strong></span>
              </td>
            </tr>
            <tr>
              <td style="padding: 5px 0;">
                <span style="display: inline-block; width: 20px; height: 20px; background: #10b981; border-radius: 50%; text-align: center; line-height: 20px; color: white; font-size: 12px; font-weight: bold; margin-right: 10px; vertical-align: middle;">&#10003;</span>
                <span style="color: #1e3a8a; font-size: 14px; font-weight: 500; vertical-align: middle;">Use this code to complete your registration</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 5px 0;">
                <span style="display: inline-block; width: 20px; height: 20px; background: #10b981; border-radius: 50%; text-align: center; line-height: 20px; color: white; font-size: 12px; font-weight: bold; margin-right: 10px; vertical-align: middle;">&#10003;</span>
                <span style="color: #1e3a8a; font-size: 14px; font-weight: 500; vertical-align: middle;">Never share this code with anyone</span>
              </td>
            </tr>
          </table>
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
          <div style="display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border-radius: 50%; width: 80px; height: 80px; line-height: 80px; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);">
            <span style="font-size: 40px; color: white;">&#128274;</span>
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
          <p style="color: #92400e; font-size: 15px; margin: 0 0 15px; font-weight: 700;">
            <span style="display: inline-block; width: 24px; height: 24px; background: #f59e0b; border-radius: 50%; text-align: center; line-height: 24px; color: white; font-size: 16px; font-weight: bold; margin-right: 8px; vertical-align: middle;">!</span>
            Security Notice
          </p>
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td style="padding: 5px 0;">
                <span style="display: inline-block; width: 18px; height: 18px; background: #10b981; border-radius: 50%; text-align: center; line-height: 18px; color: white; font-size: 11px; font-weight: bold; margin-right: 10px; vertical-align: middle;">&#10003;</span>
                <span style="color: #92400e; font-size: 14px; font-weight: 500; vertical-align: middle;">Code expires in <strong style="color: #f59e0b;">5 minutes</strong></span>
              </td>
            </tr>
            <tr>
              <td style="padding: 5px 0;">
                <span style="display: inline-block; width: 18px; height: 18px; background: #10b981; border-radius: 50%; text-align: center; line-height: 18px; color: white; font-size: 11px; font-weight: bold; margin-right: 10px; vertical-align: middle;">&#10003;</span>
                <span style="color: #92400e; font-size: 14px; font-weight: 500; vertical-align: middle;">Only use this code if you requested a password reset</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 5px 0;">
                <span style="display: inline-block; width: 18px; height: 18px; background: #10b981; border-radius: 50%; text-align: center; line-height: 18px; color: white; font-size: 11px; font-weight: bold; margin-right: 10px; vertical-align: middle;">&#10003;</span>
                <span style="color: #92400e; font-size: 14px; font-weight: 500; vertical-align: middle;">Never share this code with anyone</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 5px 0;">
                <span style="display: inline-block; width: 18px; height: 18px; background: #10b981; border-radius: 50%; text-align: center; line-height: 18px; color: white; font-size: 11px; font-weight: bold; margin-right: 10px; vertical-align: middle;">&#10003;</span>
                <span style="color: #92400e; font-size: 14px; font-weight: 500; vertical-align: middle;">If you didn't request this, please secure your account immediately</span>
              </td>
            </tr>
          </table>
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
