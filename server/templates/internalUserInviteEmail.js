/**
 * Template for internal team member invitation email.
 * Never expose internal margins, discount ceilings, stock details, or internal approval notes.
 */
function internalUserInviteEmail({ name, role, team = 'Sales Operations', invitedBy = 'System Administrator', inviteUrl }) {
  const roleDisplayNames = {
    SALES_REP: 'Sales Representative',
    SALES_MANAGER: 'Sales Manager',
    FINANCE: 'Finance & Pricing Desk',
    ADMIN: 'Administrator',
  };

  const roleLabel = roleDisplayNames[role] || role;

  const subject = 'You have been invited to join DealFlow360';

  const text = `Hello ${name},

You have been invited to join the DealFlow360 sales operations workspace.

Assigned role: ${roleLabel}
Team: ${team}
Invited by: ${invitedBy}

Accept your invitation and configure your account password here:
${inviteUrl}

This link expires in 24 hours and can be used only once.

If you did not expect this invitation, please contact your workspace administrator.`;

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
    .card { background-color: #181920; border: 1px solid #282932; border-radius: 8px; padding: 16px; margin-bottom: 24px; font-size: 13px; color: #c4c4cc; }
    .card-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
    .card-row:last-child { margin-bottom: 0; }
    .card-label { color: #71717a; font-weight: 500; }
    .card-value { color: #ededed; font-weight: 600; }
    .btn { display: inline-block; background-color: #ededed; color: #09090b; font-weight: 600; font-size: 13px; text-decoration: none; padding: 12px 24px; border-radius: 8px; text-align: center; margin-top: 8px; margin-bottom: 24px; }
    .footer { font-size: 11px; color: #52525b; line-height: 1.5; border-top: 1px solid #22232a; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">DealFlow<span style="color: #71717a;">360</span></div>
    <h1 class="title">You have been invited to DealFlow360</h1>
    <p class="paragraph">Hello <strong>${name}</strong>,</p>
    <p class="paragraph">You have been invited to join the DealFlow360 intelligent sales operations workspace.</p>
    
    <div class="card">
      <div class="card-row">
        <span class="card-label">Assigned Role:</span>
        <span class="card-value">${roleLabel}</span>
      </div>
      <div class="card-row">
        <span class="card-label">Team:</span>
        <span class="card-value">${team}</span>
      </div>
      <div class="card-row">
        <span class="card-label">Invited By:</span>
        <span class="card-value">${invitedBy}</span>
      </div>
    </div>

    <div>
      <a href="${inviteUrl}" class="btn" target="_blank">Accept Invitation</a>
    </div>

    <p class="paragraph" style="font-size: 12px; color: #71717a;">
      This link expires in 24 hours and can be used only once. If you did not request this invitation, you can safely ignore this email.
    </p>

    <div class="footer">
      DealFlow360 Intelligent Sales Operations Platform.<br>
      Secure enterprise invitation token.
    </div>
  </div>
</body>
</html>`;

  return { subject, text, html };
}

module.exports = { internalUserInviteEmail };
