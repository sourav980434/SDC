# 🏥 Santoshpur Diagnostic Centre & Polyclinic (SDCP - LIMS)

Comprehensive Laboratory Information Management System (LIMS) and Diagnostic Practice Management Suite built with **Laravel (PHP)** and **Next.js (React)**.

---

## 📁 Project Directory Structure

```text
SANTOSHPUR/
├── 📂 backend/                 # Laravel REST API (Port 8000) & Vendor dependencies
├── 📂 frontend/                # Next.js Web Frontend (Port 3000)
├── 📂 scripts/                 # Utility automation & driver installation scripts
│   ├── 📜 auto-install-sqlsrv-driver.bat # 1-Click web driver downloader & setup
│   ├── 📜 install_driver.ps1    # PowerShell downloader & php.ini optimizer
│   ├── 📜 setup-sqlsrv-driver.bat # XAMPP driver validator
│   ├── 📜 setup-first-time.bat  # First time dependency installer
│   ├── 📜 start-app.bat         # App service launcher (0.0.0.0 IP binding)
│   ├── 📜 stop-app.bat          # Background process stopper
│   └── 📜 update-code.bat       # Auto Git sync from GitHub
├── 📜 start-app.bat            # Root 1-Click Application Launcher
├── 📜 stop-app.bat             # Root 1-Click Application Stopper
├── 📜 update-code.bat          # Root 1-Click Code Updater
├── 📜 auto-install-sqlsrv-driver.bat # Root 1-Click Driver Installer
└── 📜 README.md                # System Documentation & Deployment Guide
```

---

## 🚀 Quick Setup & Deployment Guide (For Any Machine)

When setting up this project on any new PC or client system, follow these 3 simple steps:

### 1️⃣ Step 1: Update & Fetch Code
Double-click **`update-code.bat`** in the root directory.
*This automatically synchronizes the project with the latest GitHub code.*

### 2️⃣ Step 2: Install Database Drivers (1-Click)
Double-click **`auto-install-sqlsrv-driver.bat`** in the root directory.
*This automatically detects your XAMPP PHP version, downloads Microsoft SQL Server drivers from the web, copies them to `C:\xampp\php\ext\`, and configures `php.ini`.*

### 3️⃣ Step 3: Launch the Application
Double-click **`start-app.bat`** in the root directory.
*This launches both the Laravel API (Port 8000) and Next.js Frontend (Port 3000), dynamically detects the PC's network IP address (e.g. `http://192.168.x.x:3000`), and opens the web application in your browser.*

---

## 🌐 LAN & Remote Network Access

The application binds to `0.0.0.0` so it can be accessed from any machine, mobile device, or tablet on the local network or static IP:

| Service | Access URL Format | Example |
| :--- | :--- | :--- |
| **Frontend Web App** | `http://<IP_ADDRESS>:3000` | `http://192.168.0.11:3000` |
| **Backend REST API** | `http://<IP_ADDRESS>:8000/api` | `http://192.168.0.11:8000/api` |

---

## 🛠️ Launcher Scripts Summary

| Script Name | Purpose | Location |
| :--- | :--- | :--- |
| `start-app.bat` | Starts Laravel Backend & Next.js Frontend on IP | Root & `scripts/` |
| `stop-app.bat` | Gracefully terminates background PHP and Node processes | Root & `scripts/` |
| `update-code.bat` | Pulls latest updates from GitHub repository | Root & `scripts/` |
| `auto-install-sqlsrv-driver.bat` | Web-downloads & installs Microsoft SQL Server driver for XAMPP | Root & `scripts/` |
| `setup-first-time.bat` | Installs npm dependencies for new installation | `scripts/` |

---

## 🔧 Database Credentials Configuration

Database settings are stored in `backend/.env`:
- **DB_CONNECTION**: `sqlsrv`
- **DB_HOST**: `49.249.179.244` (or your target SQL Server IP/Host)
- **DB_PORT**: `5801` (or `1433`)
- **DB_DATABASE**: `DIAGMS`

---

## ❓ Troubleshooting

- **Database Connection Error (`could not find driver`)**:
  Run `auto-install-sqlsrv-driver.bat` and ensure Microsoft ODBC Driver 17 is installed on Windows.
- **Port Already in Use**:
  Run `stop-app.bat` to clear background processes.
