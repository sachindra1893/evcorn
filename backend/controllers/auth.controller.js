/**
 * Auth Controller
 */
const config = require('../config/env');
const { UnauthorizedError } = require('../errors/AppError');

class AuthController {
  async login(req, res, next) {
    try {
      const { password } = req.body;
      if (password === config.ADMIN_PASSWORD) {
        return res.json({ success: true });
      }
      throw new UnauthorizedError('Invalid Admin Password');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();
