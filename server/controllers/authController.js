const authService = require('../services/authService');
const { success, error } = require('../utils/apiResponse');

class AuthController {
  /**
   * POST /api/auth/login
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const { user, token } = await authService.login(email, password);
      res.cookie(process.env.COOKIE_NAME || 'df360_token', token, {
        httpOnly: true,
        secure:   process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days
      });
      return res.status(200).json(success({ user, token }, 'Login successful'));
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/logout
   */
  logout(req, res) {
    res.clearCookie(process.env.COOKIE_NAME || 'df360_token');
    return res.status(200).json(success(null, 'Logged out'));
  }

  /**
   * GET /api/auth/me
   */
  async getMe(req, res, next) {
    try {
      const user = await authService.getCurrentUser(req.user.userId);
      return res.status(200).json(success({ user }));
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/signup  — PERMANENTLY DISABLED
   * Public role-based signup is not allowed in DealFlow360.
   * Users are created by Admins and activate via invitation.
   */
  signup(req, res) {
    return res.status(403).json(
      error(
        'Public account creation is disabled. Contact your administrator to receive an invitation.',
        403,
        'PUBLIC_SIGNUP_DISABLED'
      )
    );
  }

  /**
   * POST /api/auth/invitation/validate
   * Step 1: Preview invitation details (no side effects).
   */
  async validateInvitation(req, res, next) {
    try {
      const { token } = req.body;
      if (!token) return res.status(400).json(error('Invitation token is required.', 400, 'MISSING_TOKEN'));
      const preview = await authService.previewInvitation(token);
      return res.status(200).json(success({ invitation: preview }, 'Invitation is valid'));
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/invitation/accept
   * Step 2: Set password and activate account.
   */
  async acceptInvitation(req, res, next) {
    try {
      const { token, password, name } = req.body;
      if (!token)    return res.status(400).json(error('Invitation token is required.', 400, 'MISSING_TOKEN'));
      if (!password) return res.status(400).json(error('Password is required.', 400, 'MISSING_PASSWORD'));
      if (password.length < 8) return res.status(400).json(error('Password must be at least 8 characters.', 400, 'WEAK_PASSWORD'));

      const { user, token: jwt } = await authService.acceptInvitation({ rawToken: token, password, name });

      res.cookie(process.env.COOKIE_NAME || 'df360_token', jwt, {
        httpOnly: true,
        secure:   process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge:   7 * 24 * 60 * 60 * 1000,
      });

      return res.status(200).json(success({ user }, 'Account activated. Welcome to DealFlow360.'));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();
