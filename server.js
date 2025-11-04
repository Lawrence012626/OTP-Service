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
    <body style="margin: 0; padding: 0; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 20px;">
        <tr>
          <td align="center">
            <!-- Main Container -->
            <table width="600" cellpadding="0" cellspacing="0" style="background: white; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); overflow: hidden; max-width: 100%;">
              
              <!-- Header with New Banner Image -->
              <tr>
                <td style="padding: 0; text-align: center;">
                  <img src="cid:header" alt="TriUoco Header" style="width: 100%; height: auto; display: block;">
                </td>
              </tr>

              <!-- Content Section -->
              <tr>
                <td style="padding: 48px 40px;">
                  <!-- Welcome Message -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding-bottom: 32px;">
                        <h2 style="margin: 0; color: #1e293b; font-size: 24px; font-weight: 600;">Welcome to TriUoco!</h2>
                        <p style="margin: 12px 0 0 0; color: #64748b; font-size: 16px; line-height: 1.5;">
                          You're just one step away from starting your language proficiency journey.
                        </p>
                      </td>
                    </tr>
                  </table>

                  <!-- OTP Code Box -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding-bottom: 32px;">
                        <div style="background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 32px; text-align: center;">
                          <p style="margin: 0 0 16px 0; color: #475569; font-size: 16px; font-weight: 500;">Your Verification Code:</p>
                          <div style="font-size: 40px; font-weight: 700; color: #1e40af; letter-spacing: 8px; font-family: 'Courier New', monospace; padding: 8px 0;">
                            ${otp}
                          </div>
                        </div>
                      </td>
                    </tr>
                  </table>

                  <!-- Info Box -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="background: #f1f5f9; border-radius: 8px; padding: 24px;">
                        <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.6;">
                          <strong>Important:</strong><br>
                          • Code expires in <strong style="color: #d97706;">5 minutes</strong><br>
                          • Use this code to complete your registration<br>
                          • Never share this code with anyone
                        </p>
                      </td>
                    </tr>
                  </table>

                  <!-- Footer Note -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 32px;">
                    <tr>
                      <td align="center">
                        <p style="margin: 0; color: #94a3b8; font-size: 14px; line-height: 1.5;">
                          If you didn't create this account, please ignore this email.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background: #fef9c3; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                  <p style="margin: 0; color: #64748b; font-size: 12px;">
                    © ${new Date().getFullYear()} TriUoca. All rights reserved.
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
      <title>Reset Your Password - TriUoco</title>
    </head>
    <body style="margin: 0; padding: 0; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 20px;">
        <tr>
          <td align="center">
            <!-- Main Container -->
            <table width="600" cellpadding="0" cellspacing="0" style="background: white; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); overflow: hidden; max-width: 100%;">
              
              <!-- Header with New Banner Image -->
              <tr>
                <td style="padding: 0; text-align: center;">
                  <img src="cid:header" alt="TriUoco Header" style="width: 100%; height: auto; display: block;">
                </td>
              </tr>

              <!-- Content Section -->
              <tr>
                <td style="padding: 48px 40px;">
                  <!-- Security Message -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding-bottom: 32px;">
                        <h2 style="margin: 0; color: #1e293b; font-size: 24px; font-weight: 600;">Reset Your Password</h2>
                        <p style="margin: 12px 0 0 0; color: #64748b; font-size: 16px; line-height: 1.5;">
                          Use the verification code below to reset your password and secure your account.
                        </p>
                      </td>
                    </tr>
                  </table>

                  <!-- OTP Code Box -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding-bottom: 32px;">
                        <div style="background: #fef9c3; border: 2px solid #fbbf24; border-radius: 12px; padding: 32px; text-align: center;">
                          <p style="margin: 0 0 16px 0; color: #d97706; font-size: 16px; font-weight: 500;">Your Reset Code:</p>
                          <div style="font-size: 40px; font-weight: 700; color: #d97706; letter-spacing: 8px; font-family: 'Courier New', monospace; padding: 8px 0;">
                            ${otp}
                          </div>
                        </div>
                      </td>
                    </tr>
                  </table>

                  <!-- Warning Box -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="background: #fef9c3; border-radius: 8px; padding: 24px;">
                        <p style="margin: 0 0 12px 0; color: #d97706; font-size: 16px; font-weight: 600;">Security Notice</p>
                        <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                          • This code expires in <strong>5 minutes</strong><br>
                          • Only use if you requested a password reset<br>
                          • Never share this code with anyone<br>
                          • Contact support if you didn't request this
                        </p>
                      </td>
                    </tr>
                  </table>

                  <!-- Footer Note -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 32px;">
                    <tr>
                      <td align="center">
                        <p style="margin: 0; color: #94a3b8; font-size: 14px; line-height: 1.5;">
                          If you didn't request a password reset, please ignore this email.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background: #fef9c3; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                  <p style="margin: 0; color: #64748b; font-size: 12px;">
                    © ${new Date().getFullYear()} TriUoco. All rights reserved.
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
      : "Welcome to TriUoco - Verify Your Email";

    const mailOptions = {
      from: `"TriUoco" <${process.env.SMTP_USER}>`,
      to: email,
      subject: subject,
      attachments: [
        {
          filename: 'header.png',
          path: './Student Contact Information Google Forms Header in Colorful Organic Style.png',
          cid: 'header'
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
