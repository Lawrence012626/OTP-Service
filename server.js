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
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; border: 1px solid #E5E7EB;">
      <!-- Header Section - Purple Gradient -->
      <div style="padding: 40px 20px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
        <div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 10px;">
          <img src="cid:logo" alt="Trivoca Logo" style="height: 60px; width: auto;">
          <div style="text-align: left;">
            <h1 style="color: white; font-size: 32px; font-weight: bold; margin: 0; line-height: 1.1;">Trivoca Entry</h1>
            <h1 style="color: white; font-size: 32px; font-weight: bold; margin: 0; line-height: 1.1;">Level</h1>
          </div>
        </div>
        <div style="text-align: center;">
          <p style="color: rgba(255, 255, 255, 0.9); font-size: 16px; margin: 0; font-weight: 400;">Language Proficiency Exam Simulator</p>
        </div>
      </div>

      <!-- Content Section -->
      <div style="background: white; padding: 40px 30px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="display: inline-block; background: #EEF2FF; border-radius: 50%; padding: 20px; margin-bottom: 20px;">
            <span style="font-size: 48px;">🎉</span>
          </div>
          <h2 style="color: #1F2937; font-size: 24px; font-weight: 600; margin: 0 0 15px;">Welcome to Trivoca!</h2>
          <p style="color: #6B7280; font-size: 16px; margin: 0; line-height: 1.5;">
            You're just one step away from starting your language proficiency journey.
          </p>
        </div>

        <!-- OTP Code Section -->
        <div style="text-align: center; margin: 30px 0;">
          <div style="background: linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%); border-radius: 12px; padding: 25px; margin: 0 auto; border: 2px solid #667eea;">
            <p style="color: #374151; font-size: 16px; margin: 0 0 10px; font-weight: 600;">Your Verification Code:</p>
            <span style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 6px; font-family: 'Courier New', monospace;">
              ${otp}
            </span>
          </div>
        </div>

        <!-- Info Section -->
        <div style="background: #F0FDF4; border-radius: 8px; padding: 20px; margin: 30px 0; border-left: 4px solid #10B981;">
          <p style="color: #065F46; font-size: 14px; margin: 0; line-height: 1.6;">
            ✓ Code expires in <strong>5 minutes</strong><br>
            ✓ Use this code to complete your registration<br>
            ✓ Never share this code with anyone
          </p>
        </div>

        <div style="text-align: center; margin-top: 30px;">
          <p style="color: #9CA3AF; font-size: 14px; line-height: 1.6; margin: 0;">
            If you didn't create this account, please ignore this email.
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
  `;
}

// Email template for PASSWORD RESET - SECURITY MESSAGE
function getPasswordResetEmailTemplate(otp) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; border: 1px solid #E5E7EB;">
      <!-- Header Section - Red Gradient -->
      <div style="padding: 40px 20px 30px; background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);">
        <div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 10px;">
          <img src="cid:logo" alt="Trivoca Logo" style="height: 60px; width: auto;">
          <div style="text-align: left;">
            <h1 style="color: white; font-size: 32px; font-weight: bold; margin: 0; line-height: 1.1; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">Trivoca Entry</h1>
            <h1 style="color: white; font-size: 32px; font-weight: bold; margin: 0; line-height: 1.1; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">Level</h1>
          </div>
        </div>
        <div style="text-align: center;">
          <p style="color: rgba(255, 255, 255, 0.95); font-size: 16px; margin: 0; font-weight: 400;">Language Proficiency Exam Simulator</p>
        </div>
      </div>

      <!-- Content Section -->
      <div style="background: white; padding: 40px 30px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="display: inline-block; background: #FEE2E2; border-radius: 50%; padding: 20px; margin-bottom: 20px;">
            <span style="font-size: 48px;">🔐</span>
          </div>
          <h2 style="color: #DC2626; font-size: 24px; font-weight: 600; margin: 0 0 15px;">Reset Your Password</h2>
          <p style="color: #6B7280; font-size: 16px; margin: 0; line-height: 1.5;">
            Use the verification code below to reset your password and secure your account.
          </p>
        </div>

        <!-- OTP Code Section -->
        <div style="text-align: center; margin: 30px 0;">
          <div style="background: linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%); border-radius: 12px; padding: 25px; margin: 0 auto; border: 2px solid #EF4444; box-shadow: 0 4px 6px rgba(239, 68, 68, 0.1);">
            <p style="color: #374151; font-size: 16px; margin: 0 0 10px; font-weight: 600;">Your Reset Code:</p>
            <span style="font-size: 32px; font-weight: bold; color: #DC2626; letter-spacing: 6px; font-family: 'Courier New', monospace;">
              ${otp}
            </span>
          </div>
        </div>

        <!-- Warning Section -->
        <div style="background: #FEF3C7; border-radius: 8px; padding: 20px; margin: 30px 0; border-left: 4px solid #F59E0B;">
          <p style="color: #92400E; font-size: 16px; margin: 0 0 8px; font-weight: 600;">⚠️ Security Alert</p>
          <p style="color: #92400E; font-size: 14px; margin: 0; line-height: 1.6;">
            • This code expires in <strong>5 minutes</strong><br>
            • Only use this code if you requested a password reset<br>
            • Never share this code with anyone<br>
            • If you didn't request this, please secure your account immediately
          </p>
        </div>

        <div style="text-align: center; margin-top: 30px;">
          <p style="color: #9CA3AF; font-size: 14px; line-height: 1.6; margin: 0;">
            If you didn't request a password reset, please ignore this email or contact support if you're concerned about your account security.
          </p>
        </div>
      </div>

      <!-- Footer Section -->
      <div style="background: #FEF2F2; padding: 20px; text-align: center; border-top: 1px solid #FECACA;">
        <p style="color: #6B7280; font-size: 12px; margin: 0;">
          © ${new Date().getFullYear()} Trivoca Entry Level. All rights reserved.
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
      ? "Password Reset - Verification Code"
      : "Welcome to Trivoca - Verify Your Email";

    // Email options
    const mailOptions = {
      from: `"Trivoca" <${process.env.SMTP_USER}>`,
      to: email,
      subject: subject,
      attachments: [
        {
          filename: 'logo.png',
          path: './logo.png',
          cid: 'logo'
        }
      ],
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
