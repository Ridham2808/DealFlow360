const { transporter, mailConfig } = require('../config/mail');
const { internalUserInviteEmail } = require('../templates/internalUserInviteEmail');
const { customerPortalInviteEmail } = require('../templates/customerPortalInviteEmail');
const { passwordResetEmail } = require('../templates/passwordResetEmail');

class EmailService {
  /**
   * Send internal team invitation email with one-time secure raw token.
   */
  async sendInternalUserInvitation({ to, name, role, team, invitedBy, rawToken }) {
    const inviteUrl = `${mailConfig.clientUrl}/accept-invitation?token=${encodeURIComponent(rawToken)}`;
    const { subject, text, html } = internalUserInviteEmail({
      name,
      role,
      team,
      invitedBy,
      inviteUrl,
    });

    return this._send({
      to,
      subject,
      text,
      html,
    });
  }

  /**
   * Send customer portal invitation email with one-time secure raw token.
   */
  async sendCustomerPortalInvitation({ to, companyName, contactName, rawToken }) {
    const inviteUrl = `${mailConfig.clientUrl}/accept-invitation?token=${encodeURIComponent(rawToken)}`;
    const { subject, text, html } = customerPortalInviteEmail({
      companyName,
      contactName,
      inviteUrl,
    });

    return this._send({
      to,
      subject,
      text,
      html,
    });
  }

  /**
   * Send password reset email.
   */
  async sendPasswordResetEmail({ to, name, resetToken }) {
    const resetUrl = `${mailConfig.clientUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;
    const { subject, text, html } = passwordResetEmail({
      name,
      resetUrl,
    });

    return this._send({
      to,
      subject,
      text,
      html,
    });
  }

  /**
   * Low-level send mail method with error handling and dev logging.
   */
  async _send({ to, subject, text, html }) {
    try {
      const mailOptions = {
        from: mailConfig.from,
        to,
        subject,
        text,
        html,
      };

      const info = await transporter.sendMail(mailOptions);

      if (process.env.NODE_ENV !== 'test') {
        console.log(`[EmailService] Sent email to: ${to} | Subject: "${subject}" | MessageId: ${info.messageId || 'mock'}`);
      }

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (err) {
      console.error(`[EmailService] Failed to deliver email to: ${to}`, err.message);
      return {
        success: false,
        error: err.message,
      };
    }
  }
}

module.exports = new EmailService();
