# Инфраструктура AWS — Elemental Reception Portal

## Обзор

Проект ERP развёрнут в **изолированной** инфраструктуре AWS. Все ресурсы имеют префикс `erp-` и не пересекаются с другими проектами в аккаунте.

**Регион:** me-central-1 (UAE)  
**AWS Account:** 760221990195

---

## Схема инфраструктуры

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  AWS me-central-1 (UAE)                                                     │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  ERP (проект — НЕ ТРОГАТЬ другие проекты)                             │  │
│  │                                                                        │  │
│  │  erp-vpc (10.1.0.0/16)                                                 │  │
│  │  ├── erp-public-1   (10.1.0.0/24)   me-central-1a                      │  │
│  │  ├── erp-public-2   (10.1.1.0/24)   me-central-1c                      │  │
│  │  ├── erp-private-1  (10.1.10.0/24)  me-central-1a                      │  │
│  │  └── erp-private-2  (10.1.11.0/24)  me-central-1c                      │  │
│  │                                                                        │  │
│  │  erp-middleware (ECR) — Docker-образы backend                          │  │
│  │                                                                        │  │
│  │  erp-terraform-state-760221990195 (S3) — Terraform state               │  │
│  │  erp-terraform-lock (DynamoDB) — блокировка Terraform                 │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  ДРУГИЕ ПРОЕКТЫ — НЕ ТРОГАТЬ                                          │  │
│  │                                                                        │  │
│  │  Doctor-agent-vpc (10.0.0.0/16)                                        │  │
│  │  doctor-agent-frontend, doctor-agent-backend (ECR)                     │  │
│  │  doctor-agent-terraform-state-* (S3)                                   │  │
│  │  terraform-state-locks (DynamoDB)                                      │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Ресурсы ERP (проект)

| Ресурс | Имя | Назначение |
|--------|-----|------------|
| VPC | erp-vpc | Сеть 10.1.0.0/16 |
| Public Subnet 1 | erp-public-1 | 10.1.0.0/24, AZ me-central-1a |
| Public Subnet 2 | erp-public-2 | 10.1.1.0/24, AZ me-central-1c |
| Private Subnet 1 | erp-private-1 | 10.1.10.0/24, AZ me-central-1a |
| Private Subnet 2 | erp-private-2 | 10.1.11.0/24, AZ me-central-1c |
| Internet Gateway | erp-igw | Исходящий трафик |
| ECR | erp-middleware | Репозиторий Docker-образов |
| S3 | erp-terraform-state-760221990195 | Terraform state |
| DynamoDB | erp-terraform-lock | Блокировка Terraform |

**ECR URL:** `760221990195.dkr.ecr.me-central-1.amazonaws.com/erp-middleware`

---

## ⚠️ Важно: что НЕ трогать при работе с проектом

### Ресурсы других проектов

В том же AWS-аккаунте есть другие проекты. Их **нельзя** изменять, удалять или использовать в ERP:

| Ресурс | Проект | Действие |
|--------|--------|----------|
| `Doctor-agent-vpc` | Doctor-agent | Не трогать |
| `10.0.0.0/16` (CIDR) | Doctor-agent | Не использовать |
| `doctor-agent-frontend` | Doctor-agent | Не трогать |
| `doctor-agent-backend` | Doctor-agent | Не трогать |
| `doctor-agent-terraform-state-*` | Doctor-agent | Не трогать |
| `terraform-state-locks` | Doctor-agent | Не трогать |
| Default VPC (172.31.0.0/16) | AWS | Не трогать |

### Правила при работе с Terraform

1. **Префикс `erp-`** — все новые ресурсы должны иметь этот префикс.
2. **CIDR 10.1.0.0/16** — наша VPC. Не менять на 10.0.0.0/16 (конфликт с Doctor-agent).
3. **Перед `terraform apply`** — всегда смотреть `terraform plan` и убедиться, что нет изменений ресурсов без префикса `erp-`.
4. **Не удалять** `erp-terraform-state-*` и `erp-terraform-lock` — без них потеряется Terraform state.

### Изоляция

- ERP использует **отдельную VPC** (10.1.0.0/16).
- Doctor-agent и ERP **не связаны** через peering или общие ресурсы.
- Пересечения CIDR нет.

---

## CI/CD

- **GitHub Actions:** push в `terraform/**` или `.github/workflows/terraform.yml` → Terraform plan + apply.
- **Secrets:** `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` в GitHub Secrets.
- **State:** хранится в S3, блокировка — в DynamoDB.

---

## Следующие шаги (после Спринт 0)

- ECS Fargate (backend в erp-vpc)
- ElastiCache Redis
- ALB
- S3 + CloudFront (frontend)

---

*Документ обновлён: март 2026*
