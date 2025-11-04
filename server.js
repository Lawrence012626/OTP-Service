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
const verifiedOTPs = new Map();

// Gmail transporter
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

// Email template for REGISTRATION
function getRegistrationEmailTemplate(otp) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Trivoca</title>
    </head>
    <body style="margin: 0; padding: 0; background: linear-gradient(135deg, #EFF6FF 0%, #FEF9C3 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 20px;">
        <tr>
          <td align="center">
            <!-- Main Container -->
            <table width="600" cellpadding="0" cellspacing="0" style="background: white; border-radius: 24px; box-shadow: 0 20px 50px rgba(37, 99, 235, 0.15); overflow: hidden; max-width: 100%;">
              
              <!-- Header with Logo and Title -->
              <tr>
                <td style="background: linear-gradient(135deg, #1E40AF 0%, #1E3A8A 100%); padding: 50px 40px; text-align: center; position: relative;">
                  <!-- Decorative circles -->
                  <div style="position: absolute; top: -30px; left: -30px; width: 100px; height: 100px; background: rgba(250, 204, 21, 0.2); border-radius: 50%; filter: blur(40px);"></div>
                  <div style="position: absolute; bottom: -20px; right: -20px; width: 80px; height: 80px; background: rgba(250, 204, 21, 0.3); border-radius: 50%; filter: blur(30px);"></div>
                  
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center">
                        <!-- Logo and Text Container -->
                        <table cellpadding="0" cellspacing="0" style="display: inline-block;">
                          <tr>
                            <td style="vertical-align: middle; padding-right: 20px;">
                              <img src="cid:logo" alt="Trivoca Logo" style="width: 80px; height: 80px; display: block; filter: drop-shadow(0 4px 12px rgba(250, 204, 21, 0.3));">
                            </td>
                            <td style="vertical-align: middle; text-align: left;">
                              <h1 style="margin: 0; padding: 0; color: white; font-size: 36px; font-weight: 800; line-height: 1.1; text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);">
                                Trivoca<br>Entry Level
                              </h1>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="padding-top: 15px;">
                        <p style="margin: 0; color: rgba(255, 255, 255, 0.95); font-size: 16px; font-weight: 500; letter-spacing: 0.5px;">
                          Language Proficiency Exam Simulator
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Content Section -->
              <tr>
                <td style="padding: 50px 40px;">
                  <!-- Welcome Icon -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding-bottom: 30px;">
                        <div style="display: inline-block; background: linear-gradient(135deg, #DBEAFE 0%, #FEF9C3 100%); border-radius: 50%; width: 100px; height: 100px; line-height: 100px; text-align: center; box-shadow: 0 8px 20px rgba(59, 130, 246, 0.2);">
                          <span style="font-size: 50px; vertical-align: middle;">🎉</span>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="padding-bottom: 15px;">
                        <h2 style="margin: 0; color: #1E3A8A; font-size: 28px; font-weight: 700;">Welcome to Trivoca!</h2>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="padding-bottom: 35px;">
                        <p style="margin: 0; color: #64748B; font-size: 16px; line-height: 1.6;">
                          You're just one step away from starting your<br>language proficiency journey.
                        </p>
                      </td>
                    </tr>
                  </table>

                  <!-- OTP Code Box -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center">
                        <table cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #EFF6FF 0%, #FEF9C3 100%); border-radius: 16px; border: 3px solid #3B82F6; padding: 30px; box-shadow: 0 4px 15px rgba(59, 130, 246, 0.15);">
                          <tr>
                            <td align="center" style="padding-bottom: 12px;">
                              <p style="margin: 0; color: #1E3A8A; font-size: 16px; font-weight: 600;">Your Verification Code:</p>
                            </td>
                          </tr>
                          <tr>
                            <td align="center">
                              <span style="font-size: 40px; font-weight: 800; color: #1E40AF; letter-spacing: 12px; font-family: 'Courier New', monospace; text-shadow: 0 2px 4px rgba(30, 64, 175, 0.1);">
                                ${otp}
                              </span>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- Info Box -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 35px;">
                    <tr>
                      <td style="background: linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%); border-radius: 12px; padding: 25px; border-left: 5px solid #3B82F6;">
                        <p style="margin: 0; color: #1E3A8A; font-size: 14px; line-height: 1.8; font-weight: 500;">
                          ✓ Code expires in <strong style="color: #1E40AF;">5 minutes</strong><br>
                          ✓ Use this code to complete your registration<br>
                          ✓ Never share this code with anyone
                        </p>
                      </td>
                    </tr>
                  </table>

                  <!-- Footer Note -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 35px;">
                    <tr>
                      <td align="center">
                        <p style="margin: 0; color: #94A3B8; font-size: 14px; line-height: 1.6;">
                          If you didn't create this account, please ignore this email.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background: linear-gradient(135deg, #F8FAFC 0%, #FEF9C3 100%); padding: 25px 40px; text-align: center; border-top: 1px solid #E2E8F0;">
                  <p style="margin: 0; color: #64748B; font-size: 13px;">
                    © ${new Date().getFullYear()} Trivoca Entry Level. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

// Email template for PASSWORD RESET
function getPasswordResetEmailTemplate(otp) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password - Trivoca</title>
    </head>
    <body style="margin: 0; padding: 0; background: linear-gradient(135deg, #EFF6FF 0%, #FEF9C3 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 20px;">
        <tr>
          <td align="center">
            <!-- Main Container -->
            <table width="600" cellpadding="0" cellspacing="0" style="background: white; border-radius: 24px; box-shadow: 0 20px 50px rgba(37, 99, 235, 0.15); overflow: hidden; max-width: 100%;">
              
              <!-- Header with Logo and Title -->
              <tr>
                <td style="background: linear-gradient(135deg, #1E40AF 0%, #1E3A8A 100%); padding: 50px 40px; text-align: center; position: relative;">
                  <!-- Decorative circles -->
                  <div style="position: absolute; top: -30px; left: -30px; width: 100px; height: 100px; background: rgba(250, 204, 21, 0.2); border-radius: 50%; filter: blur(40px);"></div>
                  <div style="position: absolute; bottom: -20px; right: -20px; width: 80px; height: 80px; background: rgba(250, 204, 21, 0.3); border-radius: 50%; filter: blur(30px);"></div>
                  
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center">
                        <!-- Logo and Text Container -->
                        <table cellpadding="0" cellspacing="0" style="display: inline-block;">
                          <tr>
                            <td style="vertical-align: middle; padding-right: 20px;">
                              <img src="cid:logo" alt="Trivoca Logo" style="width: 80px; height: 80px; display: block; filter: drop-shadow(0 4px 12px rgba(250, 204, 21, 0.3));">
                            </td>
                            <td style="vertical-align: middle; text-align: left;">
                              <h1 style="margin: 0; padding: 0; color: white; font-size: 36px; font-weight: 800; line-height: 1.1; text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);">
                                Trivoca<br>Entry Level
                              </h1>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="padding-top: 15px;">
                        <p style="margin: 0; color: rgba(255, 255, 255, 0.95); font-size: 16px; font-weight: 500; letter-spacing: 0.5px;">
                          Language Proficiency Exam Simulator
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Content Section -->
              <tr>
                <td style="padding: 50px 40px;">
                  <!-- Security Icon -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding-bottom: 30px;">
                        <div style="display: inline-block; background: linear-gradient(135deg, #DBEAFE 0%, #FEF9C3 100%); border-radius: 50%; width: 100px; height: 100px; line-height: 100px; text-align: center; box-shadow: 0 8px 20px rgba(59, 130, 246, 0.2);">
                          <span style="font-size: 50px; vertical-align: middle;">🔐</span>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="padding-bottom: 15px;">
                        <h2 style="margin: 0; color: #1E3A8A; font-size: 28px; font-weight: 700;">Reset Your Password</h2>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="padding-bottom: 35px;">
                        <p style="margin: 0; color: #64748B; font-size: 16px; line-height: 1.6;">
                          Use the verification code below to reset your password<br>and secure your account.
                        </p>
                      </td>
                    </tr>
                  </table>

                  <!-- OTP Code Box -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center">
                        <table cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #FEF9C3 0%, #FEF08A 100%); border-radius: 16px; border: 3px solid #FBBF24; padding: 30px; box-shadow: 0 4px 15px rgba(251, 191, 36, 0.2);">
                          <tr>
                            <td align="center" style="padding-bottom: 12px;">
                              <p style="margin: 0; color: #92400E; font-size: 16px; font-weight: 600;">Your Reset Code:</p>
                            </td>
                          </tr>
                          <tr>
                            <td align="center">
                              <span style="font-size: 40px; font-weight: 800; color: #D97706; letter-spacing: 12px; font-family: 'Courier New', monospace; text-shadow: 0 2px 4px rgba(217, 119, 6, 0.1);">
                                ${otp}
                              </span>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- Warning Box -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 35px;">
                    <tr>
                      <td style="background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); border-radius: 12px; padding: 25px; border-left: 5px solid #FBBF24;">
                        <p style="margin: 0 0 12px 0; color: #92400E; font-size: 16px; font-weight: 700;">⚠️ Security Alert</p>
                        <p style="margin: 0; color: #92400E; font-size: 14px; line-height: 1.8; font-weight: 500;">
                          • This code expires in <strong>5 minutes</strong><br>
                          • Only use this code if you requested a password reset<br>
                          • Never share this code with anyone<br>
                          • If you didn't request this, secure your account immediately
                        </p>
                      </td>
                    </tr>
                  </table>

                  <!-- Footer Note -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 35px;">
                    <tr>
                      <td align="center">
                        <p style="margin: 0; color: #94A3B8; font-size: 14px; line-height: 1.6;">
                          If you didn't request a password reset, please ignore this email<br>or contact support if you're concerned about your account security.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background: linear-gradient(135deg, #F8FAFC 0%, #FEF9C3 100%); padding: 25px 40px; text-align: center; border-top: 1px solid #E2E8F0;">
                  <p style="margin: 0; color: #64748B; font-size: 13px;">
                    © ${new Date().getFullYear()} Trivoca Entry Level. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

// API route to send OTP
app.post("/send-otp", async (req, res) => {
  try {
    const { email, type } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const otpType = type === 'reset' ? 'reset' : 'registration';
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000;
    
    otpStore.set(email.toLowerCase(), {
      otp: otp,
      expiresAt: expiresAt,
      attempts: 0,
      type: otpType
    });

    console.log(`OTP for ${email} (${otpType}): ${otp}`);

    const htmlTemplate = otpType === 'reset' 
      ? getPasswordResetEmailTemplate(otp)
      : getRegistrationEmailTemplate(otp);

    const subject = otpType === 'reset'
      ? "Password Reset - Verification Code"
      : "Welcome to Trivoca - Verify Your Email";

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

    if (Date.now() > storedData.expiresAt) {
      otpStore.delete(emailKey);
      return res.status(400).json({ 
        success: false,
        message: "OTP has expired. Please request a new OTP." 
      });
    }

    if (storedData.attempts >= 3) {
      otpStore.delete(emailKey);
      return res.status(400).json({ 
        success: false,
        message: "Too many failed attempts. Please request a new OTP." 
      });
    }

    if (storedData.otp !== otp.toString()) {
      storedData.attempts += 1;
      otpStore.set(emailKey, storedData);
      
      return res.status(400).json({ 
        success: false,
        message: `Invalid OTP. ${3 - storedData.attempts} attempts remaining.` 
      });
    }

    verifiedOTPs.set(emailKey, {
      verified: true,
      timestamp: Date.now(),
      expiresAt: Date.now() + (5 * 60 * 1000)
    });

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

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }

    const userRecord = await admin.auth().getUserByEmail(email);
    
    if (!userRecord) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    await admin.auth().updateUser(userRecord.uid, {
      password: newPassword
    });

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
  
  for (const [email, data] of otpStore.entries()) {
    if (now > data.expiresAt) {
      otpStore.delete(email);
      console.log(`Cleaned up expired OTP for ${email}`);
    }
  }
  
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
