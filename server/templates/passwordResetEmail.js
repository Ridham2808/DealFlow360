/**
 * Template for password reset email.
 */
function passwordResetEmail({ name, resetUrl }) {
  const subject = 'Reset your DealFlow360 password';

  const text = `Hello ${name},

We received a request to reset your password for your DealFlow360 account.

Reset your password here:
${resetUrl}

This link expires in 1 hour and can be used only once.

If you did not request a password reset, please ignore this email or notify your workspace administrator.`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0c0d11; color: #ededed; margin: 0; padding: 40px 20px; }
    .container { max-width: 520px; margin: 0 auto; background-color: #121318; border: 1px solid #22232a; border-radius: 12px; padding: 32px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .logo { font-size: 16px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px; margin-bottom: 24px; display: inline-block; }
    .title { font-size: 20px; font-weight: 600; color: #ffffff; margin-bottom: 16px; }
    .paragraph { font-size: 14px; line-height: 1.6; color: #a1a1aa; margin-bottom: 20px; }
    .btn { display: inline-block; background-color: #ededed; color: #09090b; font-weight: 600; font-size: 13px; text-decoration: none; padding: 12px 24px; border-radius: 8px; text-align: center; margin-top: 8px; margin-bottom: 24px; }
    .footer { font-size: 11px; color: #52525b; line-height: 1.5; border-top: 1px solid #22232a; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">DealFlow<span style="color: #71717a;">360</span></div>
    <h1 class="title">Reset Your Password</h1>
    <p class="paragraph">Hello <strong>${name}</strong>,</p>
    <p class="paragraph">We received a request to reset the password associated with your account.</p>

    <div>
      <a href="${resetUrl}" class="btn" target="_blank">Reset Password</a>
    </div>

    <p class="paragraph" style="font-size: 12px; color: #71717a;">
      This link is valid for 1 hour and can only be used once. If you did not request a password reset, you can safely ignore this email.
    </p>

    <div class="footer">
      DealFlow360 Intelligent Sales Operations Platform.
    </div>
  </div>
</body>
</html>`;

  return { subject, text, html };
}

module.exports = { passwordResetEmail };
