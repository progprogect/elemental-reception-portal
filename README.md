# Elemental Reception Portal

Интеграция IP-телефонии (Asterisk/FreePBX) с Zoho CRM для колл-центра. Автоматическое отображение информации о звонящем операторам в режиме реального времени.

## Структура проекта

```
├── frontend/     # React 18 + TypeScript + Vite
├── backend/      # Node.js + Express + Socket.io
├── terraform/    # AWS инфраструктура (IaC)
└── docs/         # Документация
```

## Quick Start

### Локальная разработка

```bash
# Frontend
cd frontend && npm install && npm run dev

# Backend
cd backend && npm install && cp .env.example .env && npm run dev
```

Frontend: http://localhost:5173  
Backend: http://localhost:3000 (health: http://localhost:3000/health)

### Настройка

Подробная инструкция по настройке AWS, PostgreSQL, GitHub Secrets — в [docs/SETUP.md](docs/SETUP.md).

## Документация

- [Проектная документация](Zoho_CRM_Telephony_Integration_Project_Documentation.md)
- [Инструкция по настройке](docs/SETUP.md)
