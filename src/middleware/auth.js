const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_HASH = process.env.ADMIN_HASH || bcrypt.hashSync('incassa2024', 10);
const JWT_SECRET = process.env.SESSION_SECRET || 'incassa-deco-secret-change-me';

function requireAuth(req, res, next) {
  const token = req.cookies && req.cookies.token;
  if (!token) {
    if (req.headers.accept && req.headers.accept.includes('text/html')) {
      return res.redirect('/login.html');
    }
    return res.status(401).json({ error: 'No autorizado. Inicia sesión.' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.admin = payload;
    next();
  } catch (e) {
    res.clearCookie('token');
    if (req.headers.accept && req.headers.accept.includes('text/html')) {
      return res.redirect('/login.html');
    }
    res.status(401).json({ error: 'Sesión expirada. Inicia sesión de nuevo.' });
  }
}

function login(req, res) {
  const { user, password } = req.body;
  if (!user || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
  }
  if (user !== ADMIN_USER || !bcrypt.compareSync(password, ADMIN_HASH)) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }
  const token = jwt.sign({ user, admin: true }, JWT_SECRET, { expiresIn: '4h' });
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 4 * 60 * 60 * 1000,
    sameSite: 'lax',
  });
  res.json({ ok: true });
}

function logout(req, res) {
  res.clearCookie('token');
  res.json({ ok: true });
}

function checkSession(req, res) {
  const token = req.cookies && req.cookies.token;
  if (!token) return res.json({ authenticated: false });
  try {
    jwt.verify(token, JWT_SECRET);
    res.json({ authenticated: true });
  } catch (e) {
    res.clearCookie('token');
    res.json({ authenticated: false });
  }
}

module.exports = { requireAuth, login, logout, checkSession };
