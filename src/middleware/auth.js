const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

function getJwtSecret() { return process.env.SESSION_SECRET || 'incassa-deco-secret-change-me'; }

// Multi-user registry — extend via USERS_JSON env var (JSON array of {user,hash,role})
function getUsers() {
  if (process.env.USERS_JSON) {
    try { return JSON.parse(process.env.USERS_JSON); } catch (e) { /* fall through */ }
  }
  // Built-in accounts (hashes set via individual env vars for each user)
  const users = [
    {
      user: 'disenador',
      hash: process.env.HASH_DISENADOR || '$2b$10$zmNjfTERrzI7OxHLakw8Auk2I3t1s7t2X0rQGb0vsApl07jvq7zoW',
      role: 'disenador',
    },
    {
      user: 'gerente',
      hash: process.env.HASH_GERENTE || '$2b$10$vy8KCcGzwPduSqtIPHmlgukdIesec7INSPsROJeA1elNeEpVGWi2W',
      role: 'gerente',
    },
    {
      user: 'asesor1',
      hash: process.env.HASH_ASESOR1 || '$2b$10$vnOZ/6fh69Qoy2bagZdNpOfma.upwghbd.GGAqEk9U71VFud11762',
      role: 'asesor',
    },
    {
      user: 'asesor2',
      hash: process.env.HASH_ASESOR2 || '$2b$10$8Z06uEQ6DaCsvLfCWiCrque9hk5VNrPvPoHrHXfNN7hSH7VWnyL/m',
      role: 'asesor',
    },
  ];
  // Backward compatibility: si hay ADMIN_USER + ADMIN_HASH en env (configuración anterior de Vercel)
  // se agrega como gerente para no romper acceso existente
  if (process.env.ADMIN_USER && process.env.ADMIN_HASH) {
    users.unshift({ user: process.env.ADMIN_USER, hash: process.env.ADMIN_HASH, role: 'gerente' });
  }
  return users;
}

// Roles that have full admin access
const ADMIN_ROLES = ['gerente', 'disenador'];
// Roles that have read-only / limited access
const ASESOR_ROLES = ['asesor'];

function requireAuth(req, res, next) {
  const token = req.cookies && req.cookies.token;
  if (!token) {
    if (req.headers.accept && req.headers.accept.includes('text/html')) {
      return res.redirect('/login');
    }
    return res.status(401).json({ error: 'No autorizado. Inicia sesión.' });
  }
  try {
    const payload = jwt.verify(token, getJwtSecret());
    req.admin = payload;
    next();
  } catch (e) {
    res.clearCookie('token');
    if (req.headers.accept && req.headers.accept.includes('text/html')) {
      return res.redirect('/login');
    }
    res.status(401).json({ error: 'Sesión expirada. Inicia sesión de nuevo.' });
  }
}

// Restrict route to specific roles
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.admin || !roles.includes(req.admin.role)) {
      return res.status(403).json({ error: 'No tienes permiso para esta acción.' });
    }
    next();
  };
}

function login(req, res) {
  const { user, password } = req.body;
  if (!user || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
  }
  const found = getUsers().find(u => u.user === user);
  if (!found || !bcrypt.compareSync(password, found.hash)) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }
  const token = jwt.sign({ user: found.user, role: found.role, admin: true }, getJwtSecret(), { expiresIn: '8h' });
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 8 * 60 * 60 * 1000,
    sameSite: 'lax',
  });
  res.json({ ok: true, role: found.role });
}

function logout(req, res) {
  res.clearCookie('token');
  res.json({ ok: true });
}

function checkSession(req, res) {
  const token = req.cookies && req.cookies.token;
  if (!token) return res.json({ authenticated: false });
  try {
    const payload = jwt.verify(token, getJwtSecret());
    res.json({ authenticated: true, role: payload.role, user: payload.user });
  } catch (e) {
    res.clearCookie('token');
    res.json({ authenticated: false });
  }
}

module.exports = { requireAuth, requireRole, login, logout, checkSession, ADMIN_ROLES, ASESOR_ROLES };
