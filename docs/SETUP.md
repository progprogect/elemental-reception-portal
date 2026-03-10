# Инструкция по настройке

## 1. PostgreSQL для Terraform state

Создайте PostgreSQL (один из вариантов):

- **Railway** — [railway.app](https://railway.app), free tier
- **Supabase** — [supabase.com](https://supabase.com), free tier 500MB
- **Neon** — [neon.tech](https://neon.tech), free tier

Создайте базу данных и получите connection string:
```
postgres://user:password@host:port/dbname?sslmode=require
```

## 2. GitHub Secrets

Добавьте в GitHub → Settings → Secrets and variables → Actions:

| Secret | Описание |
|--------|----------|
| `AWS_ACCESS_KEY_ID` | IAM user access key |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret key |
| `TF_BACKEND_PG_CONN_STR` | PostgreSQL connection string для Terraform state |

**Важно:** Никогда не коммитьте credentials в код.

## 3. IAM user для GitHub Actions

Создайте IAM user `erp-github-actions` с минимальными правами:

- ECR: GetAuthorizationToken, BatchGetImage, PutImage
- EC2/VPC: для Terraform (describe, create, delete ресурсов с префиксом erp-*)

Рекомендуется использовать отдельный IAM user, не root credentials.

## 4. Локальный запуск

### Frontend
```bash
cd frontend
cp .env.example .env   # при необходимости отредактировать VITE_API_URL, VITE_WS_URL
npm install
npm run dev
```

### Backend
```bash
cd backend
cp .env.example .env   # при необходимости заполнить переменные
npm install
npm run dev
```

### Terraform
```bash
cd terraform
export PG_CONN_STR="postgres://user:pass@host:port/dbname?sslmode=require"
terraform init
terraform plan
# terraform apply  # после проверки plan
```

## 5. Безопасность

- Не коммитьте `terraform.tfvars` с реальными данными
- Не коммитьте `terraform/backend.tfvars` (connection string PostgreSQL)
- Используйте `.env.example` как шаблон, реальные `.env` — в .gitignore
- Храните credentials только в GitHub Secrets или AWS Secrets Manager
