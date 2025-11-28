# File Server Setup Guide

This project includes scripts to set up a local file server.

## Setup Instructions

### 1. Initial Setup (Administrator privileges required)

Run PowerShell **as administrator** and execute:

```powershell
.\setup-file-server.ps1
```

Or use the batch file:

```batch
.\setup-file-server.bat
```

This script will:
- Create `file-server` directory
- Create Windows shared folder
- Mount to Z drive

### 2. Start Server (Subsequent runs)

```powershell
.\start-file-server.ps1
```

Or:

```batch
.\start-file-server.bat
```

Use this script when already set up.

### 3. Stop Server

```powershell
.\stop-file-server.ps1
```

Or:

```batch
.\stop-file-server.bat
```

## Usage

- File server directory: `.\file-server\`
- Access via Z drive: `Z:\`
- Network path: `\\COMPUTERNAME\LMSFileServer`

## Notes

- Administrator privileges are required for initial setup
- The shared folder grants full access to Everyone (for development use)
- Configure appropriate access control for production environments

