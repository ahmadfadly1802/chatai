const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const fs = require('fs');

// ==================== CONFIG ====================
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'chatapp-secret-key-ganti-di-production-2026';
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');

// Pastikan folder data ada
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ==================== SIMPLE JSON DB ====================
function readJSON(file, defaultVal) {
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  } catch (e) {}
  return defaultVal;
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function getUsers() {
  return readJSON(USERS_FILE, {});
}

function saveUsers(users) {
  writeJSON(USERS_FILE, users);
}

function getMessages() {
  return readJSON(MESSAGES_FILE, []);
}

function saveMessages(msgs) {
  writeJSON(MESSAGES_FILE, msgs);
}

// ==================== APP SETUP ====================
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==================== AUTH MIDDLEWARE ====================
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token tidak ditemukan' });
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token tidak valid' });
  }
}

// ==================== API ROUTES ====================

// Register
app.post('/api/register', (req, res) => {
  try {
    const { name, username, password } = req.body;
    if (!name || !username || !password) {
      return res.status(400).json({ error: 'Semua field wajib diisi' });
    }
    if (username.length < 3) {
      return res.status(400).json({ error: 'Username minimal 3 karakter' });
    }
    if (!/^[a-z0-9_]+$/.test(username.toLowerCase())) {
      return res.status(400).json({ error: 'Username hanya boleh huruf kecil, angka, dan underscore' });
    }
    if (password.length < 4) {
      return res.status(400).json({ error: 'Kata sandi minimal 4 karakter' });
    }

    const users = getUsers();
    const uname = username.toLowerCase();
    if (users[uname]) {
      return res.status(400).json({ error: 'Username sudah digunakan' });
    }

    users[uname] = {
      name: name.trim(),
      password: bcrypt.hashSync(password, 10),
      createdAt: Date.now()
    };
    saveUsers(users);

    res.json({ success: true, message: 'Akun berhasil dibuat' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mendaftar' });
  }
});

// Login
app.post('/api/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username dan kata sandi wajib diisi' });
    }

    const users = getUsers();
    const user = users[username.toLowerCase()];
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Username atau kata sandi salah' });
    }

    const token = jwt.sign(
      { username: username.toLowerCase(), name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: { username: username.toLowerCase(), name: user.name }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal masuk' });
  }
});

// Get all users
app.get('/api/users', authMiddleware, (req, res) => {
  try {
    const users = getUsers();
    const list = Object.keys(users)
      .filter(u => u !== req.user.username)
      .map(u => ({ username: u, name: users[u].name }))
      .sort((a, b) => a.name.localeCompare(b.name));
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil daftar user' });
  }
});

// Get conversations
app.get('/api/conversations', authMiddleware, (req, res) => {
  try {
    const me = req.user.username;
    const messages = getMessages();
    const users = getUsers();
    const convMap = {};

    messages.forEach(m => {
      if (m.from !== me && m.to !== me) return;
      const partner = m.from === me ? m.to : m.from;
      if (!convMap[partner]) {
        convMap[partner] = {
          username: partner,
          name: users[partner]?.name || partner,
          lastMessage: m,
          unread: 0
        };
      } else if (m.time > convMap[partner].lastMessage.time) {
        convMap[partner].lastMessage = m;
      }
      if (m.to === me && !m.read) {
        convMap[partner].unread++;
      }
    });

    const result = Object.values(convMap).sort((a, b) => b.lastMessage.time - a.lastMessage.time);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengambil percakapan' });
  }
});

// Get messages with a user
app.get('/api/messages/:partner', authMiddleware, (req, res) => {
  try {
    const me = req.user.username;
    const partner = req.params.partner.toLowerCase();
    const messages = getMessages().filter(m =>
      (m.from === me && m.to === partner) || (m.from === partner && m.to === me)
    );

    // Mark as read
    let changed = false;
    const all = getMessages();
    all.forEach(m => {
      if (m.from === partner && m.to === me && !m.read) {
        m.read = true;
        changed = true;
      }
    });
    if (changed) saveMessages(all);

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengambil pesan' });
  }
});

// Send message (REST)
app.post('/api/messages', authMiddleware, (req, res) => {
  try {
    const { to, text } = req.body;
    if (!to || !text || !text.trim()) {
      return res.status(400).json({ error: 'Penerima dan pesan wajib diisi' });
    }

    const toUser = to.toLowerCase();
    const users = getUsers();
    if (!users[toUser]) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
    }

    const time = Date.now();
    const message = {
      id: time + Math.random().toString(36).slice(2, 8),
      from: req.user.username,
      to: toUser,
      text: text.trim(),
      time,
      read: false
    };

    const messages = getMessages();
    messages.push(message);
    saveMessages(messages);

    io.to(toUser).emit('new_message', message);
    io.to(req.user.username).emit('new_message', message);

    res.json(message);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengirim pesan' });
  }
});

// Health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: Date.now() });
});

// Frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==================== SOCKET.IO ====================
const onlineUsers = new Map();

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication error'));
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  const username = socket.user.username;
  console.log(`[+] ${username} connected`);

  socket.join(username);
  onlineUsers.set(username, socket.id);
  io.emit('user_online', { username });

  socket.on('send_message', (data, callback) => {
    try {
      const { to, text } = data;
      if (!to || !text || !text.trim()) {
        if (callback) callback({ error: 'Pesan tidak valid' });
        return;
      }

      const toUser = to.toLowerCase();
      const users = getUsers();
      if (!users[toUser]) {
        if (callback) callback({ error: 'Pengguna tidak ditemukan' });
        return;
      }

      const time = Date.now();
      const message = {
        id: time + Math.random().toString(36).slice(2, 8),
        from: username,
        to: toUser,
        text: text.trim(),
        time,
        read: false
      };

      const messages = getMessages();
      messages.push(message);
      saveMessages(messages);

      io.to(toUser).emit('new_message', message);
      io.to(username).emit('new_message', message);

      if (callback) callback({ success: true, message });
    } catch (err) {
      console.error(err);
      if (callback) callback({ error: 'Gagal mengirim' });
    }
  });

  socket.on('mark_read', (partner) => {
    try {
      const messages = getMessages();
      let changed = false;
      messages.forEach(m => {
        if (m.from === partner && m.to === username && !m.read) {
          m.read = true;
          changed = true;
        }
      });
      if (changed) saveMessages(messages);
      io.to(partner).emit('messages_read', { by: username });
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('typing', (data) => {
    io.to(data.to).emit('typing', { from: username });
  });

  socket.on('stop_typing', (data) => {
    io.to(data.to).emit('stop_typing', { from: username });
  });

  socket.on('disconnect', () => {
    console.log(`[-] ${username} disconnected`);
    onlineUsers.delete(username);
    io.emit('user_offline', { username });
  });
});

// ==================== START ====================
server.listen(PORT, () => {
  console.log('');
  console.log('✅ ChatApp server berjalan di http://localhost:' + PORT);
  console.log('📦 Data disimpan di folder: ' + DATA_DIR);
  console.log('🚀 Siap di-deploy ke Railway / Render / VPS');
  console.log('');
});
