const bcrypt = require('bcryptjs');

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_HASH = process.env.ADMIN_HASH || bcrypt.hashSync('incassa2024', 10);

function requireAuth(req, res, next) {
  if (req.session && req.session.admin) {
    return next();
  }
  if (req.headers.accept && req.headers.accept.includes('text/html')) {
    return res.redirect('/login.html');
  }
  res.status(401).json({ error: 'No autorizado. Inicia sesión.' });
}

function login(req, res) {
  const { user, password } = req.body;
  if (!user || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
  }
  if (user !== ADMIN_USER || !bcrypt.compareSync(password, ADMIN_HASH)) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }
  req.session.admin = true;
  req.session.user = user;
  res.json({ ok: true });
}

function logout(req, res) {
  req.session.destroy();
  res.json({ ok: true });
}

function checkSession(req, res) {
  res.json({ authenticated: !!(req.session && req.session.admin) });
}

module.exports = { requireAuth, login, logout, checkSession };
