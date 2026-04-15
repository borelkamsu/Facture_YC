const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'youmbi_secret_2025';

module.exports = function authMiddleware(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Accès refusé. Veuillez vous connecter.' });
  }
  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Session expirée. Veuillez vous reconnecter.' });
  }
};
