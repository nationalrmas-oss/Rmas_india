/**
 * Mailer Utility for sending emails
 * Uses Brevo (formerly Sendinblue) API v4
 */
const { BrevoClient, BrevoEnvironment } = require('@getbrevo/brevo');

let brevoClient = null;

// Initialize Brevo API
function getBrevoClient() {
  if (!brevoClient) {
    brevoClient = new BrevoClient({
      apiKey: process.env.BREVO_API_KEY || '',
      environment: process.env.NODE_ENV === 'production' 
        ? BrevoEnvironment.Production 
        : BrevoEnvironment.Staging
    });
  }
  return brevoClient;
}

/**
 * Send email using Brevo API
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} htmlContent - HTML content
 * @param {string} textContent - Plain text content
 */
async function sendEmail(to, subject, htmlContent, textContent = '') {
  try {
    const client = getBrevoClient();
    
    console.log(`[EMAIL] Attempting to send email to: ${to}`);
    console.log(`[EMAIL] Sender: ${process.env.SENDER_EMAIL || 'nationalrmas@gmail.com'}`);
    
    const result = await client.transactionalEmails.sendTransacEmail({
      subject: subject,
      htmlContent: htmlContent,
      sender: { 
        email: process.env.SENDER_EMAIL || 'nationalrmas@gmail.com',
        name: 'RMAS National'
      },
      to: [{ email: to }]
    });

    console.log(`✅ Email sent successfully to ${to}`);
    console.log(`[EMAIL] Message ID: ${result.messageId}`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Error sending email:');
    console.error('Error response:', error.response?.body || error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Generate HTML for OTP email
 * @param {string} otp - 6-digit OTP
 * @param {string} userName - User's name
 */
function generateOtpEmailHTML(otp, userName) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RMAS - Password Reset OTP</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 30px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px 10px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">RMAS National</h1>
              <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Password Reset Request</p>
            </td>
          </tr>
           
          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 20px;">Hello ${userName},</h2>
               
              <p style="color: #666666; margin: 0 0 20px 0; font-size: 14px; line-height: 1.6;">
                We received a request to reset your password. Please use the following One-Time Password (OTP) to verify your identity:
              </p>
               
              <!-- OTP Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 25px 0;">
                <tr>
                  <td align="center">
                    <div style="background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%); padding: 20px 40px; border-radius: 10px; display: inline-block;">
                      <span style="color: #ffffff; font-size: 36px; font-weight: bold; letter-spacing: 8px;">${otp}</span>
                    </div>
                  </td>
                </tr>
              </table>
               
              <!-- Warning -->
              <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="color: #92400E; margin: 0; font-size: 13px; font-weight: 600;">
                  ⚠️ Important Security Notice:
                </p>
                <ul style="color: #92400E; margin: 10px 0 0 0; padding-left: 20px; font-size: 12px;">
                  <li>This OTP is valid for <strong>10 minutes only</strong></li>
                  <li>Never share this OTP with anyone</li>
                  <li>Our team will never ask for your OTP</li>
                </ul>
              </div>
               
              <p style="color: #999999; margin: 20px 0 0 0; font-size: 12px;">
                If you did not request a password reset, please ignore this email or contact support if you have concerns.
              </p>
            </td>
          </tr>
           
          <!-- Footer -->
          <tr>
            <td style="padding: 20px; background-color: #f8f9fa; border-radius: 0 0 10px 10px; text-align: center;">
              <p style="color: #999999; margin: 0; font-size: 12px;">
                © 2024 RMAS National. All rights reserved.
              </p>
              <p style="color: #cccccc; margin: 5px 0 0 0; font-size: 11px;">
                Rashtriya Mangal Application System
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Generate plain text OTP email
 * @param {string} otp - 6-digit OTP
 * @param {string} userName - User's name
 */
function generateOtpEmailText(otp, userName) {
  return `
RMAS National - Password Reset

Hello ${userName},

We received a request to reset your password. Please use the following One-Time Password (OTP):

OTP: ${otp}

This OTP is valid for 10 minutes only.

Important Security Notice:
- Never share this OTP with anyone
- Our team will never ask for your OTP

If you did not request a password reset, please ignore this email.

© 2024 RMAS National. All rights reserved.
  `.trim();
}

/**
 * Send OTP email for password reset
 * @param {string} email - Recipient email
 * @param {string} otp - 6-digit OTP
 * @param {string} name - User's name
 */
async function sendOtpEmail(email, otp, name) {
  const htmlContent = generateOtpEmailHTML(otp, name);
  const textContent = generateOtpEmailText(otp, name);
   
  return await sendEmail(
    email,
    'RMAS Password Reset - OTP Verification',
    htmlContent,
    textContent
  );
}

/**
 * Send password reset success email
 * @param {string} email - Recipient email
 * @param {string} name - User's name
 */
async function sendPasswordResetSuccessEmail(email, name) {
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>RMAS - Password Reset Successful</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 30px; text-align: center; background: linear-gradient(135deg, #10B981 0%, #059669 100%); border-radius: 10px 10px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">✓ Password Reset Successful</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <h2 style="color: #333333; margin: 0 0 20px 0;">Hello ${name},</h2>
              <p style="color: #666666; margin: 0 0 20px 0;">
                Your password has been successfully reset. You can now login with your new password.
              </p>
              <p style="color: #999999; margin: 0; font-size: 12px;">
                If you did not make this change, please contact support immediately.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px; background-color: #f8f9fa; border-radius: 0 0 10px 10px; text-align: center;">
              <p style="color: #999999; margin: 0; font-size: 12px;">© 2024 RMAS National</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
   
  const textContent = `
Password Reset Successful - RMAS

Hello ${name},

Your password has been successfully reset. You can now login with your new password.

If you did not make this change, please contact support immediately.

© 2024 RMAS National
  `.trim();
   
  return await sendEmail(
    email,
    'RMAS - Password Reset Successful',
    htmlContent,
    textContent
  );
}

/**
 * Send rejection email to member
 * @param {string} email - Recipient email
 * @param {string} name - Member's name
 * @param {string} reason - Reason for rejection
 */
async function sendRejectionEmail(email, name, reason) {
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>RMAS - Application Status Update</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 30px; text-align: center; background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); border-radius: 10px 10px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Application Rejected</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <h2 style="color: #333333; margin: 0 0 20px 0;">Hello ${name},</h2>
              <p style="color: #666666; margin: 0 0 15px 0;">
                We regret to inform you that your membership application for RMAS National has been <strong style="color: #EF4444;">rejected</strong>.
              </p>
              <div style="background-color: #FEF2F2; border-left: 4px solid #EF4444; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="color: #92400E; margin: 0; font-weight: 600;">Reason for Rejection:</p>
                <p style="color: #DC2626; margin: 10px 0 0 0;">${reason}</p>
              </div>
              <p style="color: #666666; margin: 20px 0 15px 0;">
                Don't worry! You can apply again with corrected information. Please ensure:
              </p>
              <ul style="color: #666666; margin: 0; padding-left: 20px; text-align: left;">
                <li>Your photo is clear and clearly shows your face</li>
                <li>Your Aadhar document is readable and valid</li>
                <li>All information provided is accurate</li>
                <li>You meet the membership criteria</li>
              </ul>
              <p style="color: #999999; margin: 20px 0 0 0; font-size: 12px;">
                If you believe this was a mistake or need clarification, please contact support.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px; background-color: #f8f9fa; border-radius: 0 0 10px 10px; text-align: center;">
              <p style="color: #999999; margin: 0; font-size: 12px;">© 2024 RMAS National. All rights reserved.</p>
              <p style="color: #cccccc; margin: 5px 0 0 0; font-size: 11px;">
                Rashtriya Mangal Application System
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const textContent = `
RMAS National - Application Rejected

Hello ${name},

We regret to inform you that your membership application for RMAS National has been rejected.

Reason for Rejection: ${reason}

Don't worry! You can apply again with corrected information. Please ensure:
- Your photo is clear and clearly shows your face
- Your Aadhar document is readable and valid
- All information provided is accurate
- You meet the membership criteria

If you believe this was a mistake or need clarification, please contact support.

© 2024 RMAS National. All rights reserved.
Rashtriya Mangal Application System
  `.trim();

  return await sendEmail(
    email,
    'RMAS - Application Status Update',
    htmlContent,
    textContent
  );
}

module.exports = {
  sendEmail,
  sendOtpEmail,
  sendPasswordResetSuccessEmail,
  sendRejectionEmail,
  generateOtpEmailHTML,
  generateOtpEmailText
};
