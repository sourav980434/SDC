# Santoshpur Diagnostic Centre & Polyclinic - LIMS Web Portal

সন্তোষপুর ডায়াগনস্টিক সেন্টার ও পলিক্লিনিকের ল্যাবরেটরি ইনফরমেশন ম্যানেজমেন্ট সিস্টেম (LIMS)।

**Tech Stack:** Laravel 11 (PHP) API Backend + Next.js 14 (React) Frontend + Microsoft SQL Server Database

---

## 📁 প্রজেক্ট স্ট্রাকচার

```
SANTOSHPUR/
├── backend/                           ← Laravel API (PHP 8.2)
│   ├── routes/web.php                 ← সমস্ত API endpoints
│   ├── app/                           ← Controllers, Models
│   └── .env                           ← DB connection config
│
├── frontend/                          ← Next.js 14 (React)
│   ├── src/app/                       ← Pages (booking, master, lab, etc.)
│   ├── src/components/                ← Shared UI components
│   ├── src/lib/apiConfig.js           ← Centralized API URL config
│   └── .env.local                     ← Frontend env config
│
├── scripts/                           ← Utility Scripts
│   ├── start-app.bat                  ← সার্ভিস চালু (hidden background)
│   ├── start-hidden.vbs               ← VBScript silent launcher helper
│   ├── stop-app.bat                   ← সার্ভিস বন্ধ
│   ├── update-code.bat                ← GitHub থেকে কোড আপডেট
│   ├── setup-first-time.bat           ← প্রথমবার সেটআপ (npm install + driver)
│   ├── auto-install-sqlsrv-driver.bat ← SQL Server PHP driver auto-installer
│   └── install_driver.ps1             ← PowerShell driver download script
│
├── start-app.bat                      ← রুট লঞ্চার → scripts/start-app.bat
├── stop-app.bat                       ← রুট স্টপার → scripts/stop-app.bat
├── update-code.bat                    ← রুট আপডেটার → scripts/update-code.bat
├── auto-install-sqlsrv-driver.bat     ← রুট ড্রাইভার → scripts/auto-install-...
│
├── DEVELOPMENT_LOG.md                 ← ডেভেলপমেন্ট লগ ও নিয়মাবলি
├── DISCUSSION_SUMMARY.txt             ← DB স্কিমা ও API ডকুমেন্টেশন
├── PROJECT_ARCHITECTURE.md            ← আর্কিটেকচার ডকুমেন্টেশন
├── PROJECT_ROADMAP.md                 ← প্রজেক্ট রোডম্যাপ
├── db_details.txt                     ← ডাটাবেস টেবিল স্ট্রাকচার
├── README.md                          ← এই ফাইল
└── .gitignore                         ← Git ফিল্টারিং রুলস
```

---

## 🚀 নতুন সিস্টেমে ডিপ্লয়মেন্ট (Step-by-Step)

### পূর্বশর্ত (Prerequisites)
- ✅ **XAMPP** ইনস্টল করা থাকতে হবে (`C:\xampp` বা `E:\xampp`)
- ✅ **Node.js** (v18+) ইনস্টল করা থাকতে হবে
- ✅ **Git for Windows** ইনস্টল করা থাকতে হবে
- ✅ **Microsoft SQL Server** নেটওয়ার্কে চালু থাকতে হবে

### ধাপ ১: কোড ডাউনলোড
```bash
git clone https://github.com/sourav980434/SDC.git SANTOSHPUR
```

### ধাপ ২: প্রথমবার সেটআপ
প্রজেক্ট ফোল্ডারে গিয়ে **`auto-install-sqlsrv-driver.bat`** ফাইলে ডাবল ক্লিক করুন।
> এটি স্বয়ংক্রিয়ভাবে Microsoft SQL Server PHP ড্রাইভার ডাউনলোড ও ইনস্টল করবে।

### ধাপ ৩: Backend Config
`backend/.env` ফাইলে ডাটাবেস সংযোগ তথ্য ঠিক করুন:
```env
DB_CONNECTION=sqlsrv
DB_HOST=<SQL_SERVER_IP>
DB_PORT=1433
DB_DATABASE=<DATABASE_NAME>
DB_USERNAME=<USERNAME>
DB_PASSWORD=<PASSWORD>
```

### ধাপ ৪: অ্যাপ্লিকেশন চালু
**`start-app.bat`** ফাইলে ডাবল ক্লিক করুন।
> ব্যাকএন্ড ও ফ্রন্টএন্ড সার্ভিস ব্যাকগ্রাউন্ডে চালু হবে এবং ব্রাউজারে সাইট ওপেন হবে।

### ধাপ ৫: অ্যাপ্লিকেশন বন্ধ
**`stop-app.bat`** ফাইলে ডাবল ক্লিক করুন।

### ধাপ ৬: কোড আপডেট (যেকোনো সময়)
**`update-code.bat`** ফাইলে ডাবল ক্লিক করুন।
> GitHub থেকে সর্বশেষ কোড ডাউনলোড হবে।

---

## 🔧 Scripts Reference

| স্ক্রিপ্ট | কাজ |
|-----------|------|
| `start-app.bat` | Backend (Port 8000) + Frontend (Port 3000) চালু, ব্রাউজার ওপেন |
| `stop-app.bat` | সব সার্ভিস বন্ধ |
| `update-code.bat` | GitHub থেকে latest code pull |
| `auto-install-sqlsrv-driver.bat` | SQL Server PHP driver auto download ও install |

---

## 🌐 API Architecture

- **Backend API Base:** `http://<IP_ADDRESS>:8000/api/`
- **Frontend App:** `http://<IP_ADDRESS>:3000`
- **API URL Config:** [frontend/src/lib/apiConfig.js](frontend/src/lib/apiConfig.js) — সমস্ত API call এই single config থেকে base URL নেয়। IP address স্বয়ংক্রিয়ভাবে browser hostname থেকে detect হয়।
