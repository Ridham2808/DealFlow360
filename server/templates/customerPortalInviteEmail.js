/**
 * Template for customer portal invitation email.
 * Never expose internal margins, discount ceilings, stock levels, or internal approval notes.
 */
function customerPortalInviteEmail({ companyName, contactName, inviteUrl }) {
  const subject = `Your ${companyName} quotation portal access is ready`;

  const text = `Hello ${contactName},

${companyName} has been invited to the DealFlow360 customer quotation portal.

You can use the portal to:
- View your quotation
- Request changes
- Submit a counter discount
- Confirm final terms

Open Customer Portal here:
${inviteUrl}

This link expires in 24 hours and can be used only once.`;

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
    .list { background-color: #181920; border: 1px solid #282932; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px; font-size: 13px; color: #c4c4cc; }
    .list li { margin-bottom: 6px; }
    .list li:last-child { margin-bottom: 0; }
    .btn { display: inline-block; background-color: #ededed; color: #09090b; font-weight: 600; font-size: 13px; text-decoration: none; padding: 12px 24px; border-radius: 8px; text-align: center; margin-top: 8px; margin-bottom: 24px; }
    .footer { font-size: 11px; color: #52525b; line-height: 1.5; border-top: 1px solid #22232a; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">DealFlow<span style="color: #71717a;">360</span> Portal</div>
    <h1 class="title">Your Quotation Portal Access is Ready</h1>
    <p class="paragraph">Hello <strong>${contactName}</strong>,</p>
    <p class="paragraph"><strong>${companyName}</strong> has been invited to the DealFlow360 customer quotation portal.</p>
    
    <div class="list">
      <div style="font-weight: 600; color: #ededed; margin-bottom: 8px;">You can use the portal to:</div>
      <ul style="margin: 0; padding-left: 20px; color: #a1a1aa;">
        <li>View and inspect your custom quotations</li>
        <li>Request modifications and revisions</li>
        <li>Submit counter proposals or discount requests</li>
        <li>Confirm and accept final business terms</li>
      </ul>
    </div>

    <div>
      <a href="${inviteUrl}" class="btn" target="_blank">Open Customer Portal</a>
    </div>

    <p class="paragraph" style="font-size: 12px; color: #71717a;">
      This link expires in 24 hours and can be used only once.
    </p>

    <div class="footer">
      DealFlow360 Quotation & Order Portal.<br>
      Confidential quotation access for ${companyName}.
    </div>
  </div>
</body>
</html>`;

  return { subject, text, html };
}

module.exports = { customerPortalInviteEmail };
