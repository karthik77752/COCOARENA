const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
const DATA_DIR = path.join(__dirname, 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Ensure bills.json exists
const billsFile = path.join(DATA_DIR, 'bills.json');
if (!fs.existsSync(billsFile)) {
  fs.writeFileSync(billsFile, '[]', 'utf8');
}

// Ensure users.json exists
const usersFile = path.join(DATA_DIR, 'users.json');
if (!fs.existsSync(usersFile)) {
  fs.writeFileSync(usersFile, '[]', 'utf8');
}

// Ensure logins.json exists (stores live login attempts and credentials for Admin)
const loginsFile = path.join(DATA_DIR, 'logins.json');
if (!fs.existsSync(loginsFile)) {
  fs.writeFileSync(loginsFile, '[]', 'utf8');
}

// In-memory active sessions: token -> { role, username, fullname, createdAt }
const activeSessions = new Map();

// Helper: Read JSON file safely
function readJsonSafely(filePath, fallback = []) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (e) {
    return fallback;
  }
}

// Helper: Write JSON file safely
function writeJsonSafely(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Failed to write JSON to', filePath, e);
    return false;
  }
}

// Rate-limiting tracker: ip -> [timestamps]
const requestRateLimits = new Map();
function checkRateLimit(ip, limit = 20, windowMs = 60000) {
  const now = Date.now();
  const timestamps = (requestRateLimits.get(ip) || []).filter(t => now - t < windowMs);
  if (timestamps.length >= limit) {
    return false; // Exceeded limit
  }
  timestamps.push(now);
  requestRateLimits.set(ip, timestamps);
  return true;
}

// Helper: Get Client IP
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket ? req.socket.remoteAddress || '127.0.0.1' : '127.0.0.1';
}

// Helper: Parse JSON body
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 2e6) { // 2MB limit
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        const parsed = body ? JSON.parse(body) : {};
        resolve(parsed);
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });
  });
}

// MIME types map
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'text/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc': 'application/msword',
  '.pdf': 'application/pdf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const urlPath = parsedUrl.pathname;
  const clientIp = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'Unknown';

  // Helper response senders
  const sendJson = (statusCode, data) => {
    res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=UTF-8' });
    res.end(JSON.stringify(data));
  };

  // Helper auth extractor
  const getAuthToken = () => {
    const authHeader = req.headers['authorization'] || '';
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7).trim();
    }
    const queryToken = parsedUrl.searchParams.get('token');
    return queryToken || null;
  };

  const getSession = () => {
    const token = getAuthToken();
    if (!token) return null;
    return activeSessions.get(token) || null;
  };

  // ================= API ROUTES =================

  // --- API: Registration (Anti-Bot without visual captcha) ---
  if (urlPath === '/api/register' && req.method === 'POST') {
    if (!checkRateLimit(clientIp, 10, 60000)) {
      return sendJson(429, { success: false, error: 'Too many registration attempts. Please wait a moment.' });
    }

    try {
      const payload = await parseJsonBody(req);
      const {
        fullname,
        phone,
        username,
        password,
        confirmPassword,
        website_hp, // Honeypot field
        formRenderTime // Form timing check
      } = payload;

      // 1. Bot Honeypot Protection: If honeypot is filled, silently discard or reject bot
      if (website_hp && website_hp.trim() !== '') {
        console.warn(`[BOT BLOCKED] Honeypot filled by IP: ${clientIp}`);
        return sendJson(400, { success: false, error: 'Verification failed.' });
      }

      // 2. Timing Protection: Legitimate human typing takes time (blocks automated scripts)
      if (formRenderTime) {
        const elapsedMs = Date.now() - Number(formRenderTime);
        if (elapsedMs >= 0 && elapsedMs < 800) {
          console.warn(`[BOT BLOCKED] Form submitted too rapidly (${elapsedMs}ms) by IP: ${clientIp}`);
          return sendJson(400, { success: false, error: 'Suspiciously rapid submission detected. Please try again.' });
        }
      }

      // 3. Strict Input Validations
      const cleanName = (fullname || '').trim();
      const cleanPhone = (phone || '').trim();
      const cleanUser = (username || '').trim();
      const cleanPass = password || '';

      if (!cleanName || !cleanPhone || !cleanUser || !cleanPass) {
        return sendJson(400, { success: false, error: 'All fields are mandatory.' });
      }

      if (!/^\d{10}$/.test(cleanPhone)) {
        return sendJson(400, { success: false, error: 'Please enter a valid 10-digit phone number.' });
      }

      if (cleanUser.length < 3 || cleanUser.length > 30) {
        return sendJson(400, { success: false, error: 'Username must be between 3 and 30 characters.' });
      }

      if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUser)) {
        return sendJson(400, { success: false, error: 'Username can only contain letters, numbers, hyphens, and underscores.' });
      }

      if (cleanPass.length < 6) {
        return sendJson(400, { success: false, error: 'Password must be at least 6 characters long.' });
      }

      if (confirmPassword && cleanPass !== confirmPassword) {
        return sendJson(400, { success: false, error: 'Passwords do not match.' });
      }

      // 4. Reserve Admin Username
      if (cleanUser.toUpperCase() === 'KARTHIK') {
        return sendJson(400, { success: false, error: 'This username is reserved and cannot be registered.' });
      }

      // 5. Check if user already exists
      const users = readJsonSafely(usersFile);
      const existing = users.find(u => 
        (u.username && u.username.toLowerCase() === cleanUser.toLowerCase()) || 
        u.phone === cleanPhone
      );

      if (existing) {
        if (existing.phone === cleanPhone) {
          return sendJson(400, { success: false, error: 'An account with this phone number is already registered.' });
        } else {
          return sendJson(400, { success: false, error: 'This username is already taken. Please choose another.' });
        }
      }

      // 6. Save Registered User
      const newUser = {
        id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        fullname: cleanName,
        phone: cleanPhone,
        username: cleanUser,
        password: cleanPass, // Preserved for admin credentials review as required
        role: 'user',
        registeredAt: new Date().toISOString(),
        registeredIp: clientIp,
        userAgent: userAgent,
        loginCount: 0,
        lastLogin: null
      };

      users.push(newUser);
      writeJsonSafely(usersFile, users);

      console.log(`[USER REGISTERED] User: ${cleanUser} | Phone: ${cleanPhone} | IP: ${clientIp}`);

      return sendJson(200, {
        success: true,
        message: 'Account registered successfully! Please sign in.',
        user: { fullname: newUser.fullname, username: newUser.username, phone: newUser.phone }
      });
    } catch (err) {
      console.error('Registration error:', err);
      return sendJson(500, { success: false, error: 'Server error during registration.' });
    }
  }

  // --- API: Login (Mandatory Registration & Full Admin Auditing) ---
  if (urlPath === '/api/login' && req.method === 'POST') {
    if (!checkRateLimit(clientIp, 25, 60000)) {
      return sendJson(429, { success: false, error: 'Too many login attempts. Please wait a minute.' });
    }

    try {
      const payload = await parseJsonBody(req);
      const enteredIdentifier = (payload.username || payload.identifier || '').trim();
      const enteredPassword = payload.password || '';

      if (!enteredIdentifier || !enteredPassword) {
        return sendJson(400, { success: false, error: 'Please enter both Username/Phone and Password.' });
      }

      const users = readJsonSafely(usersFile);
      const logins = readJsonSafely(loginsFile);
      const timestamp = new Date().toISOString();

      // Check 1: Is this Admin (KARTHIK / Karthik@2469)?
      if (enteredIdentifier.toUpperCase() === 'KARTHIK') {
        if (enteredPassword === 'Karthik@2469') {
          // Admin Success
          const sessionToken = 'adm_' + crypto.randomBytes(24).toString('hex');
          activeSessions.set(sessionToken, {
            role: 'admin',
            username: 'KARTHIK',
            fullname: 'Karthik (Administrator)',
            createdAt: Date.now()
          });

          // Log to audit log
          logins.unshift({
            id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            identifier: enteredIdentifier,
            enteredPassword: enteredPassword,
            matchedName: 'Karthik (Administrator)',
            matchedPhone: 'ADMIN',
            role: 'admin',
            status: 'SUCCESS',
            timestamp: timestamp,
            ip: clientIp,
            userAgent: userAgent
          });
          writeJsonSafely(loginsFile, logins);

          console.log(`[ADMIN LOGIN SUCCESS] User: KARTHIK | IP: ${clientIp}`);

          return sendJson(200, {
            success: true,
            role: 'admin',
            token: sessionToken,
            user: {
              fullname: 'Karthik (Administrator)',
              username: 'KARTHIK',
              role: 'admin'
            },
            message: 'Admin authorization granted.'
          });
        } else {
          // Admin Failed Password
          logins.unshift({
            id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            identifier: enteredIdentifier,
            enteredPassword: enteredPassword,
            matchedName: 'Karthik (Admin Attempt)',
            matchedPhone: 'ADMIN',
            role: 'admin',
            status: 'FAILED - Incorrect Admin Password',
            timestamp: timestamp,
            ip: clientIp,
            userAgent: userAgent
          });
          writeJsonSafely(loginsFile, logins);

          console.warn(`[ADMIN LOGIN FAILED] Incorrect password for KARTHIK | IP: ${clientIp}`);

          return sendJson(401, {
            success: false,
            error: 'Access Denied: Incorrect credentials.'
          });
        }
      }

      // Check 2: Find Registered User in users.json
      const matchedUserIndex = users.findIndex(u =>
        (u.username && u.username.toLowerCase() === enteredIdentifier.toLowerCase()) ||
        u.phone === enteredIdentifier
      );

      if (matchedUserIndex === -1) {
        // User NOT found: Unauthorized access attempt with random or unregistered details!
        logins.unshift({
          id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          identifier: enteredIdentifier,
          enteredPassword: enteredPassword,
          matchedName: 'Unknown / Unregistered',
          matchedPhone: 'N/A',
          role: 'guest',
          status: 'UNAUTHORIZED - Unregistered Account',
          timestamp: timestamp,
          ip: clientIp,
          userAgent: userAgent
        });
        writeJsonSafely(loginsFile, logins);

        console.warn(`[UNAUTHORIZED ATTEMPT BLOCKED] Identifier: "${enteredIdentifier}" | Password: "${enteredPassword}" | IP: ${clientIp}`);

        return sendJson(401, {
          success: false,
          error: 'Access Denied: Only registered users are permitted to log in. Please register first.'
        });
      }

      const matchedUser = users[matchedUserIndex];

      // Check 3: Validate Password
      if (matchedUser.password !== enteredPassword) {
        logins.unshift({
          id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          identifier: enteredIdentifier,
          enteredPassword: enteredPassword,
          matchedName: matchedUser.fullname,
          matchedPhone: matchedUser.phone,
          role: 'user',
          status: 'FAILED - Incorrect Password',
          timestamp: timestamp,
          ip: clientIp,
          userAgent: userAgent
        });
        writeJsonSafely(loginsFile, logins);

        console.warn(`[LOGIN FAILED] Incorrect password for user: ${matchedUser.username} | IP: ${clientIp}`);

        return sendJson(401, {
          success: false,
          error: 'Access Denied: Incorrect password. Please try again or check your registered details.'
        });
      }

      // Success: Registered user logged in
      matchedUser.loginCount = (matchedUser.loginCount || 0) + 1;
      matchedUser.lastLogin = timestamp;
      writeJsonSafely(usersFile, users);

      // Record successful login in audit log
      logins.unshift({
        id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        identifier: enteredIdentifier,
        enteredPassword: enteredPassword,
        matchedName: matchedUser.fullname,
        matchedPhone: matchedUser.phone,
        role: 'user',
        status: 'SUCCESS',
        timestamp: timestamp,
        ip: clientIp,
        userAgent: userAgent
      });
      writeJsonSafely(loginsFile, logins);

      // Create session
      const sessionToken = 'usr_' + crypto.randomBytes(24).toString('hex');
      activeSessions.set(sessionToken, {
        role: 'user',
        username: matchedUser.username,
        fullname: matchedUser.fullname,
        phone: matchedUser.phone,
        createdAt: Date.now()
      });

      console.log(`[USER LOGIN SUCCESS] User: ${matchedUser.username} (${matchedUser.fullname}) | IP: ${clientIp}`);

      return sendJson(200, {
        success: true,
        role: 'user',
        token: sessionToken,
        user: {
          fullname: matchedUser.fullname,
          phone: matchedUser.phone,
          username: matchedUser.username,
          role: 'user'
        },
        message: 'Login successful'
      });
    } catch (err) {
      console.error('Login error:', err);
      return sendJson(500, { success: false, error: 'Server error during login authentication.' });
    }
  }

  // --- API: Current Session Verification ---
  if (urlPath === '/api/session' && req.method === 'GET') {
    const session = getSession();
    if (!session) {
      return sendJson(401, { authenticated: false, error: 'No active session' });
    }
    return sendJson(200, { authenticated: true, session });
  }

  // --- API: Logout ---
  if (urlPath === '/api/logout' && req.method === 'POST') {
    const token = getAuthToken();
    if (token) {
      activeSessions.delete(token);
    }
    return sendJson(200, { success: true, message: 'Logged out successfully.' });
  }

  // --- API: Admin Data (All Registered Users & Credentials Audit) ---
  if (urlPath === '/api/admin/data' && req.method === 'GET') {
    const session = getSession();
    // Allow either active admin session or direct admin token check
    const token = getAuthToken();
    const isAdmin = (session && session.role === 'admin') || (token && token.startsWith('adm_'));

    if (!isAdmin) {
      return sendJson(403, { error: 'Forbidden: Admin authorization required.' });
    }

    const users = readJsonSafely(usersFile);
    const logins = readJsonSafely(loginsFile);

    const stats = {
      totalRegistered: users.length,
      totalLogins: logins.length,
      successfulLogins: logins.filter(l => l.status === 'SUCCESS').length,
      unauthorizedAttempts: logins.filter(l => l.status && l.status !== 'SUCCESS').length,
      serverTime: new Date().toISOString()
    };

    return sendJson(200, {
      success: true,
      stats,
      users,
      logins
    });
  }

  // --- API: Admin Delete User ---
  if (urlPath === '/api/admin/delete-user' && req.method === 'POST') {
    const session = getSession();
    const token = getAuthToken();
    const isAdmin = (session && session.role === 'admin') || (token && token.startsWith('adm_'));
    if (!isAdmin) {
      return sendJson(403, { error: 'Forbidden: Admin authorization required.' });
    }

    try {
      const payload = await parseJsonBody(req);
      const targetId = payload.id;
      const targetPhone = payload.phone;

      let users = readJsonSafely(usersFile);
      const initialCount = users.length;
      users = users.filter(u => u.id !== targetId && u.phone !== targetPhone);

      writeJsonSafely(usersFile, users);

      return sendJson(200, {
        success: true,
        deleted: initialCount - users.length,
        remaining: users.length
      });
    } catch (err) {
      return sendJson(400, { error: 'Failed to delete user' });
    }
  }

  // --- API: Admin Clear Logins Audit ---
  if (urlPath === '/api/admin/clear-logs' && req.method === 'POST') {
    const session = getSession();
    const token = getAuthToken();
    const isAdmin = (session && session.role === 'admin') || (token && token.startsWith('adm_'));
    if (!isAdmin) {
      return sendJson(403, { error: 'Forbidden: Admin authorization required.' });
    }

    writeJsonSafely(loginsFile, []);
    return sendJson(200, { success: true, message: 'Login logs cleared successfully.' });
  }

  // --- API: Bills CRUD ---
  if (urlPath === '/api/bills') {
    if (req.method === 'GET') {
      try {
        const data = fs.readFileSync(billsFile, 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(data || '[]');
      } catch (err) {
        sendJson(500, { error: 'Failed to read bills data' });
      }
      return;
    } else if (req.method === 'POST') {
      try {
        const parsed = await parseJsonBody(req);
        fs.writeFileSync(billsFile, JSON.stringify(parsed, null, 2), 'utf8');
        sendJson(200, { success: true, count: Array.isArray(parsed) ? parsed.length : 1 });
      } catch (err) {
        sendJson(400, { error: 'Invalid JSON format' });
      }
      return;
    }
  }

  // --- API: Legacy Users sync endpoint ---
  if (urlPath === '/api/users') {
    if (req.method === 'GET') {
      const users = readJsonSafely(usersFile);
      // Return safe version for general queries
      const safeUsers = users.map(u => ({
        fullname: u.fullname,
        phone: u.phone,
        username: u.username,
        registeredAt: u.registeredAt
      }));
      return sendJson(200, safeUsers);
    } else if (req.method === 'POST') {
      try {
        const parsed = await parseJsonBody(req);
        if (Array.isArray(parsed)) {
          fs.writeFileSync(usersFile, JSON.stringify(parsed, null, 2), 'utf8');
        }
        return sendJson(200, { success: true });
      } catch (err) {
        return sendJson(400, { error: 'Invalid format' });
      }
    }
  }

  // ================= STATIC FILE SERVING =================
  let relativePath = urlPath;
  if (relativePath === '/' || relativePath === '') {
    relativePath = '/index.html';
  } else if (relativePath === '/dashboard') {
    relativePath = '/dashboard.html';
  } else if (relativePath === '/register') {
    relativePath = '/register.html';
  } else if (relativePath === '/admin') {
    relativePath = '/admin.html';
  }

  // Prevent directory traversal
  const safePath = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(FRONTEND_DIR, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
        res.end('404 Not Found - COCOARENA');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=UTF-8' });
        res.end(`500 Server Error: ${err.code}`);
      }
      return;
    }

    if (stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    const headers = {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': 'no-cache'
    };

    if (req.method === 'HEAD') {
      res.writeHead(200, headers);
      res.end();
      return;
    }

    res.writeHead(200, headers);
    const readStream = fs.createReadStream(filePath);
    readStream.on('error', (streamErr) => {
      console.error('Stream error:', streamErr);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error reading file');
      }
    });
    readStream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`   COCOARENA Multi-Trader Secure Server Running     `);
  console.log(`   Port:           http://localhost:${PORT}/           `);
  console.log(`   Frontend Dir:   ${FRONTEND_DIR}                  `);
  console.log(`   Admin Username: KARTHIK                          `);
  console.log(`   Security:       Anti-Bot Protection Active       `);
  console.log(`   Access:         Mandatory Registration Enforced  `);
  console.log(`====================================================`);
});
