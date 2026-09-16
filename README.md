# ChatApp – WhatsApp Style (Real-time Backend)

Aplikasi chat real-time mirip WhatsApp yang **siap di-deploy ke hosting**.

## Fitur

- ✅ Register & Login (JWT + bcrypt)
- ✅ Chat 1-on-1 real-time (Socket.io)
- ✅ Status online/offline
- ✅ Typing indicator ("sedang mengetik...")
- ✅ Unread badge
- ✅ UI/UX mirip WhatsApp Web
- ✅ Database file JSON (tidak butuh database eksternal)
- ✅ Responsive (HP & Desktop)

## Struktur File

```
├── package.json
├── server.js              ← Backend (Express + Socket.io)
├── public/
│   └── index.html         ← Frontend lengkap
├── data/                  ← Otomatis dibuat (users.json + messages.json)
└── README.md
```

## Cara Menjalankan Lokal

```bash
# 1. Install dependencies
npm install

# 2. Jalankan server
npm start
```

Buka browser: **http://localhost:3000**

## Deploy ke Hosting (Sudah Siap)

Aplikasi ini **sudah siap di-hosting** tanpa konfigurasi rumit.

### 1. Railway.app (Paling Mudah – Gratis)
1. Buat akun di https://railway.app
2. New Project → Deploy from GitHub repo (atau upload folder ini)
3. Railway otomatis detect Node.js & jalankan `npm start`
4. (Opsional) Tambah Environment Variable:
   - `JWT_SECRET` = string rahasia panjang (contoh: `rahasia_chatapp_2026_xyz`)
5. Deploy → dapat domain gratis seperti `xxx.up.railway.app`

### 2. Render.com
1. Buat akun di https://render.com
2. New → Web Service
3. Connect repo GitHub atau upload
4. **Build Command**: `npm install`
5. **Start Command**: `npm start`
6. Environment Variables (opsional):
   - `JWT_SECRET` = string rahasia
7. Deploy

### 3. VPS / DigitalOcean / Contabo / AWS
```bash
# Upload seluruh folder ke server
cd folder-chatapp
npm install
npm install -g pm2
pm2 start server.js --name chatapp
pm2 save
pm2 startup
```

### 4. Heroku
```bash
heroku create nama-app-anda
git push heroku main
```

## Environment Variables

| Variable     | Default                        | Keterangan                          |
|--------------|--------------------------------|-------------------------------------|
| `PORT`       | 3000                           | Port server (hosting biasanya otomatis) |
| `JWT_SECRET` | chatapp-secret-key-...         | **Ganti di production** untuk keamanan |

## Catatan Penting untuk Hosting

- Folder `data/` akan otomatis dibuat saat pertama kali dijalankan
- Pastikan folder `data/` **writable** (permission write)
- Ganti `JWT_SECRET` di production
- Socket.io membutuhkan dukungan WebSocket (Railway, Render, VPS sudah support)
- Tidak butuh database MySQL/PostgreSQL/MongoDB – cukup file JSON

## Cara Pakai Aplikasi

1. Buka website (setelah di-deploy atau lokal)
2. Klik tab **Daftar** → isi Nama, Username, Password
3. Klik **Masuk**
4. Klik ikon **chat baru** (pojok kanan atas) → pilih user lain
5. Mulai chat real-time antar perangkat/browser

---

**Sistem sudah 100% siap untuk di-daftarkan / di-deploy ke hosting.**  
Tidak perlu menambah apapun lagi.
