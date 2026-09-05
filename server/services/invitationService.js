const crypto = require('crypto');
const prisma = require('../prisma/prisma');

// Token expiry: 48 hours for internal users, 72 hours for customers
const EXPIRY_HOURS = { INTERNAL_USER: 48, CUSTOMER_PORTAL: 72 };

class InvitationService {
  /**
   * Generate a cryptographically secure raw token and its SHA-256 hash.
   */
  _generateToken() {
    const raw = crypto.randomBytes(32).toString('hex'); // 64-char hex
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    return { raw, hash };
  }

  /**
   * Create an invitation record.
   * Returns raw token (never stored) — caller must surface this to Admin.
   * In production this would be emailed; for dev it is returned in API response.
   *
   * @param {object} opts
   * @param {string} opts.email
   * @param {string} opts.role         - Role enum value
   * @param {string} opts.type         - InvitationType: INTERNAL_USER | CUSTOMER_PORTAL
   * @param {string} opts.invitedById  - Admin user id
   * @param {string|null} opts.customerId
   */
  async create({ email, role, type, invitedById, customerId = null }) {
    const cleanEmail = email.toLowerCase().trim();
    const { raw, hash } = this._generateToken();
    const hours = EXPIRY_HOURS[type] || 48;
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

    // Invalidate any previous pending invitations for this email
    await prisma.invitation.updateMany({
      where: { email: cleanEmail, isUsed: false, acceptedAt: null },
      data:  { isUsed: true },
    });

    const invitation = await prisma.invitation.create({
      data: {
        email:       cleanEmail,
        role,
        type,
        tokenHash:   hash,
        invitedById,
        customerId,
        expiresAt,
      },
    });

    return { invitation, rawToken: raw };
  }

  /**
   * Validate a raw token without consuming it.
   * Used by frontend Step 1 to preview invitation details.
   */
  async validate(rawToken) {
    const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const inv = await prisma.invitation.findUnique({
      where: { tokenHash: hash },
      include: { invitedBy: { select: { name: true } } },
    });
    if (!inv)                           throw this._invErr('INVITATION_NOT_FOUND', 'Invitation not found or already used.', 404);
    if (inv.isUsed || inv.acceptedAt)   throw this._invErr('INVITATION_ALREADY_USED', 'This invitation has already been accepted.', 409);
    if (new Date() > inv.expiresAt)     throw this._invErr('INVITATION_EXPIRED', 'This invitation has expired. Ask your administrator to resend.', 410);
    return inv;
  }

  /**
   * Consume a raw token — mark used, return invitation record.
   * Call this only after password has been set and user activated.
   */
  async consume(rawToken) {
    const inv = await this.validate(rawToken);
    await prisma.invitation.update({
      where: { id: inv.id },
      data:  { isUsed: true, acceptedAt: new Date() },
    });
    return inv;
  }

  /**
   * Resend (replace) invitation for a user.
   */
  async resend({ email, role, type, invitedById, customerId }) {
    return this.create({ email, role, type, invitedById, customerId });
  }

  _invErr(code, message, status) {
    const err = new Error(message);
    err.status  = status;
    err.code    = code;
    return err;
  }
}

module.exports = new InvitationService();
