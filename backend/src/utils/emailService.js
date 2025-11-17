import nodemailer from 'nodemailer';

// Create reusable transporter object using SMTP transport
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail', // or any other email service
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Generate 6-digit OTP
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP email
export const sendOTPEmail = async (email, otp) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"FitFaat" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'FitFaat - Email Verification OTP',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              background-color: #f4f4f4;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 40px auto;
              background-color: #ffffff;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 30px;
              text-align: center;
              color: white;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
            }
            .content {
              padding: 40px 30px;
              text-align: center;
            }
            .otp-box {
              background-color: #f8f9fa;
              border: 2px dashed #667eea;
              border-radius: 8px;
              padding: 20px;
              margin: 30px 0;
              display: inline-block;
            }
            .otp {
              font-size: 36px;
              font-weight: bold;
              color: #667eea;
              letter-spacing: 8px;
              margin: 0;
            }
            .message {
              color: #666;
              font-size: 16px;
              line-height: 1.6;
              margin: 20px 0;
            }
            .warning {
              background-color: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin: 20px 0;
              color: #856404;
              text-align: left;
              border-radius: 4px;
            }
            .footer {
              background-color: #f8f9fa;
              padding: 20px;
              text-align: center;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏋️ FitFaat</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px;">Email Verification</p>
            </div>
            <div class="content">
              <h2 style="color: #333; margin-top: 0;">Verify Your Email Address</h2>
              <p class="message">
                Thank you for signing up with FitFaat! To complete your registration, 
                please use the following One-Time Password (OTP):
              </p>
              <div class="otp-box">
                <p class="otp">${otp}</p>
              </div>
              <p class="message">
                Enter this code in the app to verify your email address and activate your account.
              </p>
              <div class="warning">
                <strong>⚠️ Important:</strong>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>This OTP is valid for <strong>10 minutes</strong></li>
                  <li>Do not share this code with anyone</li>
                  <li>If you didn't request this, please ignore this email</li>
                </ul>
              </div>
            </div>
            <div class="footer">
              <p style="margin: 0;">© 2025 FitFaat. All rights reserved.</p>
              <p style="margin: 10px 0 0 0;">Start your fitness journey today! 💪</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('OTP Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw new Error('Failed to send OTP email');
  }
};

// Send welcome email after successful verification
export const sendWelcomeEmail = async (email, username) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"FitFaat" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Welcome to FitFaat! 🎉',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              background-color: #f4f4f4;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 40px auto;
              background-color: #ffffff;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 40px 30px;
              text-align: center;
              color: white;
            }
            .content {
              padding: 40px 30px;
            }
            .button {
              display: inline-block;
              padding: 15px 30px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
              font-weight: bold;
            }
            .footer {
              background-color: #f8f9fa;
              padding: 20px;
              text-align: center;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 32px;">🎉 Welcome to FitFaat!</h1>
            </div>
            <div class="content">
              <h2 style="color: #333;">Hi ${username}! 👋</h2>
              <p style="color: #666; font-size: 16px; line-height: 1.6;">
                Congratulations on successfully verifying your account! We're thrilled to have you join the FitFaat community.
              </p>
              <p style="color: #666; font-size: 16px; line-height: 1.6;">
                You're now ready to:
              </p>
              <ul style="color: #666; font-size: 16px; line-height: 1.8;">
                <li>📊 Track your daily nutrition and hydration</li>
                <li>💪 Follow personalized workout plans</li>
                <li>🥗 Access custom diet plans</li>
                <li>📈 Monitor your progress</li>
                <li>🏥 Connect with fitness professionals</li>
              </ul>
              <p style="color: #666; font-size: 16px; line-height: 1.6;">
                Let's start your fitness journey today!
              </p>
            </div>
            <div class="footer">
              <p style="margin: 0;">© 2025 FitFaat. All rights reserved.</p>
              <p style="margin: 10px 0 0 0;">Need help? Contact us anytime! 💪</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Welcome email sent successfully');
  } catch (error) {
    console.error('Error sending welcome email:', error);
    // Don't throw error for welcome email as it's not critical
  }
};
