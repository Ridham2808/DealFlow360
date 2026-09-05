const authService = require('../services/authService');
const { sendSuccess } = require('../utils/apiResponse');
const { getCookieOptions, COOKIE_NAME } = require('../utils/tokenHelper');

class AuthController {
  /**
   * Handle user signup
   */
  async signup(req, res, next) {
    try {
      const { user, token } = await authService.register(req.body);
      
      // Set secure HTTP-only cookie
      res.cookie(COOKIE_NAME, token, getCookieOptions());
      
      return sendSuccess(res, { user, token }, 201, 'User registered successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Handle user login
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const { user, token } = await authService.login(email, password);

      // Set secure HTTP-only cookie
      res.cookie(COOKIE_NAME, token, getCookieOptions());

      return sendSuccess(res, { user, token }, 200, 'Login successful');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Handle user logout
   */
  async logout(req, res) {
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
    });
    return sendSuccess(res, { loggedOut: true }, 200, 'Logged out successfully');
  }

  /**
   * Return current authenticated user profile
   */
  async getMe(req, res, next) {
    try {
      const user = await authService.getCurrentUser(req.user.id);
      return sendSuccess(res, { user }, 200);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();
