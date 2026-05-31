# Artisan Avenue - Client Setup Guide

## Quick start (Windows)

### Requirements
- Node.js 18-22 from https://nodejs.org/
- MongoDB from https://www.mongodb.com/try/download/community
- Keep the MongoDB Windows service Running

### First time only
1. Copy the folder outside OneDrive if possible (e.g. C:\Projects\ArtisanAvenue)
2. Double-click SETUP.bat (or run: npm run setup)
3. Run: npm run seed

### Every day
Double-click START.bat (or run: npm run dev:all)

- Website: http://localhost:5173
- API check: http://localhost:4000/api/health

## Demo accounts (after seed)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@artisan.test | AdminPass123! |
| Vendor | elena.russo@artisan.demo | Password1 |
| Vendor | priya.sharma@artisan.demo | Password1 |

Admin login: /admin/login

## Troubleshooting

- MongoDB failed: start MongoDB service, check server/.env MONGO_URI
- Empty shop: npm run seed
- Port 4000 busy: close other terminals
- Terminals disconnect: avoid OneDrive folder, use one START.bat window

## Zip checklist

Include source code, SETUP.bat, START.bat, server/.env.example
Exclude node_modules folders (client runs setup to install)
