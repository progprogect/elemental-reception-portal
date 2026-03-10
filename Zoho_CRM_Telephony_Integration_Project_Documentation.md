# ПРОЕКТНАЯ ДОКУМЕНТАЦИЯ

## Интеграция IP-телефонии с Zoho CRM

**Версия:** 1.0  
**Дата создания:** 09.03.2026  
**Регион развертывания:** UAE (AE)  
**Инфраструктура:** AWS

---

## Содержание

1. [Обзор проекта](#1-обзор-проекта)
2. [Архитектура системы](#2-архитектура-системы)
3. [Интеграция с Zoho CRM (AE регион)](#3-интеграция-с-zoho-crm-ae-регион)
4. [Asterisk Manager Interface (AMI) интеграция](#4-asterisk-manager-interface-ami-интеграция)
5. [Функциональные требования](#5-функциональные-требования)
6. [Нефункциональные требования](#6-нефункциональные-требования)
7. [AWS Инфраструктура](#7-aws-инфраструктура)
8. [Terraform Infrastructure as Code](#8-terraform-infrastructure-as-code)
9. [CI/CD Pipeline (GitHub Actions)](#9-cicd-pipeline-github-actions)
10. [Work Breakdown Structure (WBS)](#10-work-breakdown-structure-wbs)
11. [Безопасность данных](#11-безопасность-данных)
12. [Масштабирование и производительность](#12-масштабирование-и-производительность)
13. [Мониторинг и алертинг](#13-мониторинг-и-алертинг)
14. [Планы на будущие версии](#14-планы-на-будущие-версии)
15. [Глоссарий](#15-глоссарий)
16. [Ссылки на документацию](#16-ссылки-на-документацию)

---

## 1. Обзор проекта

### 1.1. Цель проекта

Создание интеграционного решения между IP-телефонией (Asterisk/FreePBX) и Zoho CRM для автоматического отображения информации о звонящем абоненте операторам колл-центра в режиме реального времени. Система позволит операторам мгновенно видеть историю взаимодействия с клиентом и создавать новые контакты прямо во время звонка.

### 1.2. Ключевые возможности

- Автоматическая идентификация звонящего по номеру телефона через Zoho CRM API
- Всплывающее окно с информацией о контакте в момент входящего звонка
- Быстрое создание новых контактов через упрощенную форму
- Автоматическое логирование звонков как активностей в CRM
- Маршрутизация уведомлений конкретному оператору через WebSocket
- Заложена архитектура для будущей AI-расшифровки звонков (v2)

### 1.3. Ограничения и требования

- IP-телефония не поддерживает нативную интеграцию через Zoho Phonebridge
- Все персональные данные должны храниться исключительно в Zoho CRM (регион AE)
- Инфраструктура должна размещаться в AWS (предпочтительно регион me-south-1 или eu-west)
- Система должна быть развернута с использованием Infrastructure as Code (Terraform)
- CI/CD pipeline должен быть настроен с первого спринта

---

## 2. Архитектура системы

### 2.1. Высокоуровневая схема

Система состоит из трех основных компонентов:

1. **IP-АТС (Asterisk/FreePBX)** — источник событий о звонках через AMI
2. **Middleware Server (AWS)** — интеграционный слой между АТС и CRM
3. **Zoho CRM (AE регион)** — хранилище контактов и активностей

**Поток данных:**
```
IP-АТС → AMI Events → Middleware → Zoho CRM API (поиск контакта) → 
Middleware → WebSocket → Browser UI оператора
```

### 2.2. Компоненты Middleware Server

| Компонент | Описание |
|-----------|----------|
| **AMI Listener** | Подключается к АТС через TCP, слушает события: Newchannel, AgentConnect, Hangup |
| **WebSocket Server** | Обеспечивает real-time коммуникацию с браузерами операторов через WSS |
| **REST API** | Принимает данные из UI для создания/обновления контактов, логирования |
| **Zoho API Client** | Модуль для взаимодействия с Zoho CRM API (поиск, создание, обновление) |
| **Session Manager** | Управление сессиями операторов, маппинг extension → WebSocket connection |

### 2.3. Технологический стек

| Слой | Технология | Обоснование |
|------|------------|-------------|
| Backend | Node.js 20 LTS + Express + Socket.io | Асинхронность, WebSocket поддержка, легкость интеграции |
| Frontend | React 18 + TypeScript + Socket.io-client | Компонентность, типизация, real-time updates |
| Кеш | Redis 7 | Хранение сессий, TTL для временных данных звонков |
| Инфраструктура | AWS (ECS Fargate, ElastiCache, ALB, CloudFront) | Serverless контейнеры, managed сервисы, глобальный CDN |
| IaC | Terraform 1.7+ | Воспроизводимость инфраструктуры, версионирование |
| CI/CD | GitHub Actions | Нативная интеграция с GitHub, простота настройки |

---

## 3. Интеграция с Zoho CRM (AE регион)

### 3.1. OAuth 2.0 аутентификация

**Базовый URL для региона AE:** https://accounts.zoho.ae  
**Документация:** https://www.zoho.com/crm/developer/docs/api/v3/oauth-overview.html

**Шаги регистрации приложения:**

1. Перейти в API Console: https://api-console.zoho.ae
2. Создать Server-based Application
3. Получить Client ID и Client Secret
4. Сгенерировать Grant Token (scope: ZohoCRM.modules.ALL, ZohoCRM.settings.ALL)
5. Обменять Grant Token на Refresh Token

**Endpoint для получения Access Token:**

```http
POST https://accounts.zoho.ae/oauth/v2/token
```

**Параметры:**
- `grant_type` = refresh_token
- `client_id` = <YOUR_CLIENT_ID>
- `client_secret` = <YOUR_CLIENT_SECRET>
- `refresh_token` = <YOUR_REFRESH_TOKEN>

### 3.2. API Endpoints для работы с контактами

**Базовый URL API:** https://www.zohoapis.ae/crm/v3  
**Документация API v3:** https://www.zoho.com/crm/developer/docs/api/v3/

#### 3.2.1. Поиск контакта по номеру телефона

```http
GET https://www.zohoapis.ae/crm/v3/Contacts/search
```

**Query параметры:**
- `criteria` = (Phone:equals:+971501234567)
- `fields` = id,First_Name,Last_Name,Phone,Email,Account_Name

**Headers:**
- `Authorization`: Zoho-oauthtoken <ACCESS_TOKEN>

**Пример ответа:**
```json
{
  "data": [{
    "id": "5843104000000648001",
    "First_Name": "Ahmed",
    "Last_Name": "Al-Rashid",
    "Phone": "+971501234567",
    "Email": "ahmed@example.com",
    "Account_Name": "ABC Trading LLC"
  }]
}
```

**Документация:** https://www.zoho.com/crm/developer/docs/api/v3/search-records.html

#### 3.2.2. Получение полной информации о контакте

```http
GET https://www.zohoapis.ae/crm/v3/Contacts/{contact_id}
```

**Документация:** https://www.zoho.com/crm/developer/docs/api/v3/get-specific-record.html

#### 3.2.3. Создание нового контакта

```http
POST https://www.zohoapis.ae/crm/v3/Contacts
```

**Request Body:**
```json
{
  "data": [{
    "First_Name": "Mohammed",
    "Last_Name": "Hassan",
    "Phone": "+971501234568",
    "Email": "mohammed@example.com",
    "Date_of_Birth": "1990-05-15",
    "Lead_Source": "Inbound Call"
  }]
}
```

**Документация:** https://www.zoho.com/crm/developer/docs/api/v3/insert-records.html

#### 3.2.4. Логирование звонка как активности

```http
POST https://www.zohoapis.ae/crm/v3/Calls
```

**Request Body:**
```json
{
  "data": [{
    "Subject": "Inbound call from +971501234567",
    "Call_Duration": "00:05:23",
    "Call_Type": "Inbound",
    "Who_Id": {"id": "5843104000000648001"},
    "Call_Start_Time": "2026-03-09T14:30:00+04:00",
    "Call_Purpose": "General Inquiry",
    "Description": "Customer inquiry handled by operator"
  }]
}
```

**Документация:** https://www.zoho.com/crm/developer/docs/api/v3/activities-overview.html

### 3.3. Rate Limits и Best Practices

- **API Rate Limit:** 5000 credits per day (1 GET = 1 credit, 1 POST = 1 credit)
- **Concurrent Requests:** Максимум 10 одновременных запросов
- Использовать кеширование результатов поиска контактов (Redis TTL 5 минут)
- Обрабатывать 429 (Too Many Requests) с exponential backoff
- Обновлять Access Token автоматически при получении 401

**Документация по лимитам:** https://www.zoho.com/crm/developer/docs/api/v3/api-limits.html

---

## 4. Asterisk Manager Interface (AMI) интеграция

### 4.1. Обзор AMI

AMI предоставляет TCP интерфейс для мониторинга и управления Asterisk/FreePBX. Middleware подключается к порту 5038 (стандартный) и подписывается на события звонков.

**Документация Asterisk AMI:** https://docs.asterisk.org/Asterisk_20_Documentation/API_Documentation/AMI/

### 4.2. Конфигурация AMI на стороне АТС

**Файл:** `/etc/asterisk/manager.conf`

```ini
[general]
enabled = yes
port = 5038
bindaddr = 0.0.0.0

[middleware_user]
secret = <SECURE_PASSWORD>
deny = 0.0.0.0/0.0.0.0
permit = <MIDDLEWARE_SERVER_IP>/32
read = call,system
write = no
```

⚠️ **Важно:** Разрешить подключение только с IP адреса Middleware сервера

### 4.3. События AMI для отслеживания

| Событие | Когда происходит | Ключевые поля |
|---------|-----------------|---------------|
| **Newchannel** | Создание нового канала (входящий звонок) | CallerIDNum, Channel, Exten |
| **AgentConnect** | Оператор принял звонок | Queue, MemberName, Interface |
| **Hangup** | Завершение звонка | Cause, Duration, Channel |

### 4.4. Логика обработки событий

**Сценарий входящего звонка:**

1. **Newchannel** → Извлечь CallerID, сохранить в Redis с TTL 10 минут
2. **AgentConnect** → Определить extension оператора, запустить поиск в Zoho CRM, отправить WebSocket событие
3. **Hangup** → Рассчитать длительность, создать запись активности в Zoho, очистить данные из Redis

---

## 5. Функциональные требования

### 5.1. Обработка входящих звонков

**FR-01: Автоматическая идентификация звонящего**

- При входящем звонке система должна автоматически искать контакт в Zoho CRM по номеру телефона
- Поиск должен выполняться асинхронно, не блокируя обработку других событий
- Результат поиска должен кешироваться в Redis на 5 минут

**FR-02: Отображение информации о контакте**

- Если контакт найден, в браузере оператора должно открыться popup-окно с информацией:
  - Имя и фамилия
  - Номер телефона
  - Email адрес
  - Компания (Account Name)
  - История последних 3 звонков
- Popup должно включать кнопку для перехода в полную карточку Zoho CRM

**FR-03: Создание нового контакта**

- Если контакт не найден, должна отображаться форма создания с полями:
  - First Name (обязательное)
  - Last Name (обязательное)
  - Phone (предзаполненное, read-only)
  - Email (опциональное)
  - Date of Birth (опциональное)
- После нажатия Save контакт должен создаваться в Zoho CRM
- Должна быть валидация обязательных полей перед отправкой

### 5.2. Логирование звонков

**FR-04: Автоматическое создание активности**

- При завершении звонка (событие Hangup) система должна автоматически создавать запись в Zoho CRM Activities
- Активность должна содержать:
  - Тип: Inbound Call
  - Длительность звонка
  - Время начала
  - Связь с контактом (Who_Id)
  - Имя оператора

### 5.3. Управление операторами

**FR-05: Аутентификация и маппинг операторов**

- Каждый оператор должен войти в систему, указав свой extension (внутренний номер)
- Система должна поддерживать маппинг extension → WebSocket connection
- При логауте оператора его WebSocket соединение должно корректно закрываться
- Должна быть защита от двойного логина с одним extension

---

## 6. Нефункциональные требования

### 6.1. Производительность

- **NFR-01:** Время от события AgentConnect до отображения popup ≤ 2 секунды
- **NFR-02:** Поддержка до 50 одновременных операторов
- **NFR-03:** Обработка до 200 звонков в час

### 6.2. Безопасность

- **NFR-04:** Все соединения должны использовать TLS/SSL (HTTPS, WSS)
- **NFR-05:** Credentials (Zoho OAuth tokens, AMI password) должны храниться в AWS Secrets Manager
- **NFR-06:** Персональные данные клиентов НЕ должны храниться в AWS (только в Zoho CRM и Redis с TTL)
- **NFR-07:** Логи не должны содержать номера телефонов, имена клиентов (только hashed ID)
- **NFR-08:** AMI доступ только с IP адреса Middleware (whitelist)

### 6.3. Надежность

- **NFR-09:** Availability target: 99.5% (допустимо до 3.6 часа downtime в месяц)
- **NFR-10:** Автоматический reconnect при потере AMI соединения (exponential backoff)
- **NFR-11:** Health checks для ECS задач (каждые 30 секунд)

### 6.4. Масштабируемость

- **NFR-12:** Архитектура должна позволять горизонтальное масштабирование (до 3 ECS задач)
- **NFR-13:** Redis должен использоваться для shared state между инстансами

### 6.5. Мониторинг и логирование

- **NFR-14:** Все логи должны отправляться в CloudWatch Logs
- **NFR-15:** Метрики (количество звонков, latency, errors) в CloudWatch Metrics
- **NFR-16:** CloudWatch Alarms для критических событий (AMI disconnect, API failures)

---

## 7. AWS Инфраструктура

### 7.1. Архитектура компонентов

| Сервис AWS | Назначение | Конфигурация |
|------------|-----------|--------------|
| **Route 53** | DNS управление | Hosted Zone для домена, A-record для ALB |
| **CloudFront** | CDN для фронтенда | Origin: S3 bucket, SSL сертификат |
| **S3** | Хранение статики | Frontend build files (React), versioning enabled |
| **ALB** | Load Balancer | Target: ECS tasks, SSL termination |
| **ECS Fargate** | Контейнеры backend | 2 vCPU, 4GB RAM, autoscaling 1-3 tasks |
| **ECR** | Container Registry | Docker images для middleware |
| **ElastiCache Redis** | Кеш и сессии | t3.micro (512MB), Multi-AZ disabled |
| **Secrets Manager** | Секреты | Zoho OAuth, AMI credentials |
| **CloudWatch** | Мониторинг | Logs, Metrics, Alarms |

### 7.2. Регион и зоны доступности

- **Основной регион:** me-south-1 (Bahrain) — ближайший к UAE
- **Альтернативный регион:** eu-west-1 (Ireland) — если me-south-1 недоступен
- **Availability Zones:** 2 AZ для высокой доступности (ALB, ECS)

### 7.3. Сетевая архитектура

- VPC: 10.0.0.0/16
- Public Subnets (2): 10.0.1.0/24, 10.0.2.0/24 — для ALB
- Private Subnets (2): 10.0.10.0/24, 10.0.11.0/24 — для ECS, ElastiCache
- NAT Gateway: для исходящего трафика из ECS (Zoho API)
- Security Groups:
  - ALB SG: 443 (входящий от 0.0.0.0/0)
  - ECS SG: 3000 (входящий от ALB SG), все (исходящий)
  - Redis SG: 6379 (входящий от ECS SG)

---

## 8. Terraform Infrastructure as Code

### 8.1. Структура Terraform проекта

```
terraform/
├── main.tf              # Основная конфигурация
├── variables.tf         # Переменные
├── outputs.tf           # Выходные значения
├── terraform.tfvars     # Значения переменных (не в git)
├── modules/
│   ├── vpc/             # VPC, subnets, NAT
│   ├── ecs/             # ECS cluster, service, task definition
│   ├── alb/             # Application Load Balancer
│   ├── elasticache/     # Redis cluster
│   ├── s3/              # S3 bucket для фронтенда
│   ├── cloudfront/      # CloudFront distribution
│   └── secrets/         # Secrets Manager
└── backend.tf           # S3 backend для state
```

### 8.2. Основные модули

#### 8.2.1. VPC Module

```hcl
# modules/vpc/main.tf
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  tags = {
    Name        = "${var.project_name}-vpc"
    Environment = var.environment
  }
}

resource "aws_subnet" "public" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]
  
  map_public_ip_on_launch = true
  
  tags = {
    Name = "${var.project_name}-public-${count.index + 1}"
  }
}

resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 10)
  availability_zone = data.aws_availability_zones.available.names[count.index]
  
  tags = {
    Name = "${var.project_name}-private-${count.index + 1}"
  }
}
```

#### 8.2.2. ECS Module

```hcl
# modules/ecs/main.tf
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster"
  
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_ecs_task_definition" "middleware" {
  family                   = "${var.project_name}-middleware"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "2048"
  memory                   = "4096"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn
  
  container_definitions = jsonencode([{
    name      = "middleware"
    image     = "${var.ecr_repository_url}:latest"
    essential = true
    
    portMappings = [{
      containerPort = 3000
      protocol      = "tcp"
    }]
    
    environment = [
      { name  = "NODE_ENV", value = "production" },
      { name  = "REDIS_HOST", value = var.redis_endpoint }
    ]
    
    secrets = [
      { name = "ZOHO_CLIENT_ID", valueFrom = "${var.secrets_arn}:ZOHO_CLIENT_ID::" },
      { name = "ZOHO_CLIENT_SECRET", valueFrom = "${var.secrets_arn}:ZOHO_CLIENT_SECRET::" },
      { name = "AMI_PASSWORD", valueFrom = "${var.secrets_arn}:AMI_PASSWORD::" }
    ]
    
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/${var.project_name}"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "middleware"
      }
    }
  }])
}

resource "aws_ecs_service" "middleware" {
  name            = "${var.project_name}-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.middleware.arn
  desired_count   = 1
  launch_type     = "FARGATE"
  
  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.ecs_security_group_id]
    assign_public_ip = false
  }
  
  load_balancer {
    target_group_arn = var.target_group_arn
    container_name   = "middleware"
    container_port   = 3000
  }
  
  health_check_grace_period_seconds = 60
  
  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 100
  }
}

resource "aws_appautoscaling_target" "ecs" {
  max_capacity       = 3
  min_capacity       = 1
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.middleware.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "cpu" {
  name               = "${var.project_name}-cpu-autoscaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace
  
  target_tracking_scaling_policy_configuration {
    target_value = 70.0
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
  }
}
```

### 8.3. Backend конфигурация

Terraform state хранится в S3 с DynamoDB для locking:

```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket         = "telephony-crm-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "me-south-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}
```

---

## 9. CI/CD Pipeline (GitHub Actions)

### 9.1. Workflow для Backend

```yaml
# .github/workflows/backend.yml
name: Backend CI/CD

on:
  push:
    branches: [main, develop]
    paths:
      - 'backend/**'
  pull_request:
    branches: [main]

env:
  AWS_REGION: me-south-1
  ECR_REPOSITORY: telephony-crm-middleware

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: |
          cd backend
          npm ci
      
      - name: Run linter
        run: |
          cd backend
          npm run lint
      
      - name: Run tests
        run: |
          cd backend
          npm test
  
  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
      
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1
      
      - name: Build and push Docker image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG backend/
          docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY:latest
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest
      
      - name: Update ECS service
        run: |
          aws ecs update-service \
            --cluster telephony-crm-cluster \
            --service telephony-crm-service \
            --force-new-deployment \
            --region $AWS_REGION
```

### 9.2. Workflow для Frontend

```yaml
# .github/workflows/frontend.yml
name: Frontend CI/CD

on:
  push:
    branches: [main, develop]
    paths:
      - 'frontend/**'

env:
  AWS_REGION: me-south-1
  S3_BUCKET: telephony-crm-frontend
  CLOUDFRONT_DISTRIBUTION_ID: ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }}

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install and build
        run: |
          cd frontend
          npm ci
          npm run build
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
      
      - name: Deploy to S3
        run: |
          aws s3 sync frontend/dist s3://$S3_BUCKET --delete
      
      - name: Invalidate CloudFront cache
        run: |
          aws cloudfront create-invalidation \
            --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
            --paths "/*"
```

### 9.3. Workflow для Terraform

```yaml
# .github/workflows/terraform.yml
name: Terraform CI/CD

on:
  push:
    branches: [main]
    paths:
      - 'terraform/**'
  pull_request:
    branches: [main]
    paths:
      - 'terraform/**'

env:
  TF_VERSION: '1.7.0'

jobs:
  terraform:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v2
        with:
          terraform_version: ${{ env.TF_VERSION }}
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: me-south-1
      
      - name: Terraform Init
        run: |
          cd terraform
          terraform init
      
      - name: Terraform Format Check
        run: |
          cd terraform
          terraform fmt -check
      
      - name: Terraform Validate
        run: |
          cd terraform
          terraform validate
      
      - name: Terraform Plan
        run: |
          cd terraform
          terraform plan -out=tfplan
      
      - name: Terraform Apply
        if: github.ref == 'refs/heads/main' && github.event_name == 'push'
        run: |
          cd terraform
          terraform apply -auto-approve tfplan
```

---

## 10. Work Breakdown Structure (WBS)

Проект разбит на спринты длительностью 2 недели. Каждая задача включает конкретные deliverables и acceptance criteria.

### 10.1. Спринт 0: Подготовка инфраструктуры и CI/CD (2 недели)

#### Задача 0.1: Настройка AWS аккаунта и сервисов

**Deliverables:**
- AWS аккаунт с настроенным IAM
- S3 bucket для Terraform state
- DynamoDB таблица для state locking
- ECR репозиторий для Docker images

**Acceptance Criteria:**
- IAM роли созданы согласно принципу least privilege
- Terraform backend работает корректно
- ECR доступен для push/pull

#### Задача 0.2: Регистрация Zoho CRM приложения

**Deliverables:**
- Zoho Server-based Application создано
- Client ID и Client Secret получены
- Refresh Token сгенерирован
- Токены сохранены в AWS Secrets Manager

**Acceptance Criteria:**
- OAuth flow работает
- API запросы к Zoho CRM успешны
- Токены автоматически обновляются

#### Задача 0.3: Terraform: базовая инфраструктура

**Deliverables:**
- VPC, subnets, NAT Gateway
- Security Groups
- ElastiCache Redis cluster
- Secrets Manager с секретами

**Acceptance Criteria:**
- `terraform plan` выполняется без ошибок
- `terraform apply` создает всю инфраструктуру
- Redis доступен из private subnet

#### Задача 0.4: CI/CD: GitHub Actions

**Deliverables:**
- Workflow для backend (lint, test, build, deploy)
- Workflow для frontend (build, deploy to S3)
- Workflow для Terraform (plan, apply)
- Secrets настроены в GitHub

**Acceptance Criteria:**
- Push в main триггерит deploy
- Pull requests проходят lint и tests
- Terraform changes требуют approval

### 10.2. Спринт 1: Middleware Backend Core (2 недели)

#### Задача 1.1: AMI Listener модуль

**Deliverables:**
- TCP клиент для подключения к Asterisk AMI
- Event parser для Newchannel, AgentConnect, Hangup
- Reconnection logic с exponential backoff
- Unit tests для AMI модуля

**Acceptance Criteria:**
- Подключение к АТС успешно
- События парсятся корректно
- Reconnect работает при потере соединения
- Code coverage ≥ 80%

#### Задача 1.2: Zoho CRM API Client

**Deliverables:**
- OAuth 2.0 authentication модуль
- Методы: searchContact, getContact, createContact, logCall
- Rate limiting и retry logic
- Error handling для 401, 429, 500

**Acceptance Criteria:**
- Все API методы работают с Zoho AE region
- Токены обновляются автоматически
- Rate limits не превышаются
- 429 errors обрабатываются с backoff

#### Задача 1.3: Redis Session Manager

**Deliverables:**
- Класс для работы с Redis
- Методы: saveCallData, getCallData, clearCallData
- TTL management (10 минут для активных звонков)
- Operator session tracking (extension → connection mapping)

**Acceptance Criteria:**
- Данные корректно сохраняются в Redis
- TTL работает автоматически
- Одновременные звонки не конфликтуют

#### Задача 1.4: Docker и ECS deployment

**Deliverables:**
- Dockerfile для backend
- Terraform: ECS task definition, service, ALB target group
- Health check endpoint (/health)
- Логирование в CloudWatch

**Acceptance Criteria:**
- Docker image собирается и пушится в ECR
- ECS сервис запускается и проходит health checks
- Логи видны в CloudWatch
- ALB маршрутизирует трафик на ECS

### 10.3. Спринт 2: WebSocket и событийная логика (2 недели)

#### Задача 2.1: WebSocket Server

**Deliverables:**
- Socket.io сервер с WSS поддержкой
- Аутентификация клиентов (extension validation)
- Room management (один extension = один room)
- События: call_incoming, contact_found, contact_not_found

**Acceptance Criteria:**
- Клиенты подключаются по WSS
- Extension дублирование блокируется
- События доставляются только нужному оператору
- Reconnection работает на клиенте

#### Задача 2.2: Интеграция AMI → Zoho → WebSocket

**Deliverables:**
- Event handler для AgentConnect
- Извлечение CallerID и extension
- Поиск в Zoho CRM по CallerID
- Push уведомления через WebSocket
- Кеширование результатов в Redis

**Acceptance Criteria:**
- При входящем звонке оператор получает уведомление ≤ 2 секунды
- Если контакт найден, отправляется полная информация
- Если контакт не найден, отправляется event для формы создания
- Повторные звонки от одного номера используют кеш

#### Задача 2.3: Hangup event handler и логирование

**Deliverables:**
- Event handler для Hangup
- Расчет длительности звонка
- Автоматическое создание Call activity в Zoho
- Очистка данных из Redis

**Acceptance Criteria:**
- После завершения звонка создается запись в Zoho Activities
- Длительность рассчитывается корректно
- Связь с контактом (Who_Id) установлена
- Redis данные удаляются

#### Задача 2.4: REST API для UI

**Deliverables:**
- POST /api/contacts - создание контакта
- GET /api/contacts/:id - получение контакта
- POST /api/auth/login - логин оператора (extension)
- Middleware для валидации запросов

**Acceptance Criteria:**
- Все endpoints работают и возвращают корректный JSON
- Валидация обязательных полей
- 400, 401, 500 ошибки обрабатываются
- API документация (Swagger) доступна

### 10.4. Спринт 3: Frontend UI (2 недели)

#### Задача 3.1: Базовая структура React приложения

**Deliverables:**
- Create React App + TypeScript
- Socket.io-client интеграция
- Routing (React Router)
- State management (Context API или Zustand)
- Tailwind CSS для стилизации

**Acceptance Criteria:**
- Приложение собирается без ошибок
- WebSocket подключается к backend
- Типизация TypeScript корректна

#### Задача 3.2: Страница логина оператора

**Deliverables:**
- Форма ввода extension
- Валидация (только цифры)
- Подключение WebSocket после логина
- Хранение session в localStorage

**Acceptance Criteria:**
- Оператор может войти, указав extension
- Двойной логин с одним extension блокируется
- После refresh страницы сессия восстанавливается

#### Задача 3.3: Popup: информация о контакте

**Deliverables:**
- Модальное окно с данными контакта
- Отображение: имя, телефон, email, компания, история звонков
- Кнопка "Open in Zoho CRM" (новая вкладка)
- Auto-close при Hangup event

**Acceptance Criteria:**
- Popup открывается при call_incoming + contact_found
- Данные отображаются корректно
- Кнопка открывает правильный URL в Zoho
- Popup закрывается автоматически

#### Задача 3.4: Форма создания нового контакта

**Deliverables:**
- Форма с полями: First Name, Last Name, Phone, Email, Date of Birth
- Валидация обязательных полей
- Отправка данных в backend API (POST /api/contacts)
- Success/error уведомления

**Acceptance Criteria:**
- Форма открывается при contact_not_found
- Phone поле предзаполнено и read-only
- Валидация работает (обязательные поля)
- После сохранения контакт создается в Zoho
- Показывается уведомление об успехе/ошибке

### 10.5. Спринт 4: Тестирование и Production готовность (2 недели)

#### Задача 4.1: End-to-end тестирование

**Deliverables:**
- Тестовые сценарии: входящий звонок с найденным контактом
- Тестовые сценарии: входящий звонок с новым контактом
- Тестовые сценарии: несколько одновременных звонков
- Автоматизированные E2E тесты (Playwright или Cypress)

**Acceptance Criteria:**
- Все сценарии проходят успешно
- NFR-01 выполнено (popup ≤ 2 секунды)
- Система обрабатывает 10 одновременных звонков без ошибок

#### Задача 4.2: Мониторинг и алерты

**Deliverables:**
- CloudWatch Dashboard с метриками
- CloudWatch Alarms: AMI disconnect, Zoho API errors, ECS unhealthy
- SNS topic для уведомлений
- Email подписка на critical alarms

**Acceptance Criteria:**
- Dashboard отображает: количество звонков, latency, errors
- Alarms срабатывают при критических событиях
- Email уведомления приходят

#### Задача 4.3: Документация

**Deliverables:**
- README.md с инструкциями по развертыванию
- API документация (Swagger)
- Runbook для операторов
- Troubleshooting guide

**Acceptance Criteria:**
- Новый разработчик может развернуть систему по README
- API документация актуальна
- Runbook покрывает типичные проблемы

#### Задача 4.4: Security аудит и hardening

**Deliverables:**
- Проверка всех NFR-04 до NFR-08 требований
- Сканирование Docker images на уязвимости (Trivy)
- Настройка AWS WAF для CloudFront/ALB
- Ротация секретов в Secrets Manager

**Acceptance Criteria:**
- Все соединения используют TLS
- Секреты не хардкоднутся в коде
- Docker images без критических уязвимостей
- WAF блокирует SQL injection и XSS

---

## 11. Безопасность данных

### 11.1. Принципы безопасности

- Defense in Depth — многоуровневая защита
- Least Privilege — минимальные необходимые права
- Encryption at Rest and in Transit — шифрование данных
- Zero Trust — не доверять по умолчанию
- Data Residency — персональные данные только в Zoho CRM (AE регион)

### 11.2. Защита данных в transit

- ALB → HTTPS (TLS 1.2+), сертификат от AWS Certificate Manager
- CloudFront → HTTPS, сертификат от ACM
- WebSocket → WSS (TLS encrypted)
- Backend → Zoho API: HTTPS с проверкой сертификата
- Middleware → AMI: TCP (внутри VPC, Security Group защита)

### 11.3. Защита данных at rest

- ElastiCache Redis: шифрование at rest включено
- S3 bucket (фронтенд): server-side encryption (SSE-S3)
- CloudWatch Logs: encryption enabled
- Secrets Manager: encryption по умолчанию (AWS KMS)

### 11.4. Управление секретами

- Все секреты хранятся в AWS Secrets Manager
- Автоматическая ротация: каждые 30 дней для Zoho Refresh Token
- AMI password: manual rotation каждые 90 дней
- ECS задачи получают секреты через environment variables из Secrets Manager
- GitHub Secrets: только для AWS credentials и deployment keys

### 11.5. Логирование и аудит

- CloudTrail: логирование всех AWS API calls
- CloudWatch Logs: все логи приложений
- Логи не содержат PII (номера телефонов заменяются на hashed ID)
- Retention: CloudWatch Logs — 30 дней, CloudTrail — 90 дней
- Регулярный audit logs для обнаружения подозрительной активности

---

## 12. Масштабирование и производительность

### 12.1. Горизонтальное масштабирование

ECS Service Auto Scaling основан на CPU utilization:

- Min capacity: 1 task
- Max capacity: 3 tasks
- Target CPU: 70%
- Scale-up: если avg CPU > 70% в течение 2 минут
- Scale-down: если avg CPU < 40% в течение 5 минут

### 12.2. Кеширование

- Redis TTL для результатов поиска контактов: 5 минут
- Redis TTL для данных активных звонков: 10 минут
- CloudFront cache для статических файлов фронтенда: 1 день
- Invalidation CloudFront cache при deployment

### 12.3. Оптимизация API запросов

- Batch requests к Zoho CRM, где возможно
- Использование fields parameter для минимизации payload
- Connection pooling для HTTP клиента
- Request timeout: 5 секунд для поиска контактов

---

## 13. Мониторинг и алертинг

### 13.1. CloudWatch Metrics

**Собираемые метрики:**

| Метрика | Описание | Threshold |
|---------|----------|-----------|
| **CallsProcessed** | Количество обработанных звонков | N/A |
| **ContactSearchLatency** | Время поиска контакта в Zoho | < 1000 ms |
| **WebSocketLatency** | Время от AgentConnect до popup | < 2000 ms |
| **ZohoAPIErrors** | Ошибки при запросах к Zoho | < 1% от запросов |
| **AMIConnectionStatus** | Статус подключения к АТС | 1 = connected |
| **ECSCPUUtilization** | Загрузка CPU ECS задач | < 80% |

### 13.2. CloudWatch Alarms

**Настроенные алармы:**

- ECS Unhealthy Tasks: если unhealthy tasks > 0 в течение 2 минут → SNS notification
- High API Error Rate: если Zoho API errors > 5% в течение 5 минут → SNS notification
- AMI Disconnected: если AMI connection status = 0 в течение 1 минуты → SNS notification
- High CPU: если ECS CPU > 85% в течение 5 минут → SNS notification
- Redis Connection Failures: если Redis errors > 10 в течение 5 минут → SNS notification

### 13.3. Dashboard

**CloudWatch Dashboard включает:**

- Количество активных операторов (WebSocket connections)
- Количество звонков за последний час, день, неделю
- Средняя latency поиска контактов
- Средняя latency WebSocket уведомлений
- Количество ошибок Zoho API
- ECS CPU и Memory utilization
- Redis hit rate

---

## 14. Планы на будущие версии

### 14.1. Версия 2.0: AI-расшифровка звонков

**Возможности:**

- Интеграция с Asterisk AudioSocket для получения аудиопотока
- Real-time транскрипция через AWS Transcribe или OpenAI Whisper
- Автоматическое извлечение информации (имя, email, дата рождения)
- Автозаполнение формы создания контакта с подтверждением оператором
- Сохранение транскрипта в Zoho CRM как Note

### 14.2. Версия 3.0: Расширенные интеграции

**Возможности:**

- Интеграция с календарями (Google Calendar, Outlook) для создания follow-up задач
- Интеграция с ticketing системами (Jira, Zendesk)
- SMS уведомления клиентам после звонка (через AWS SNS или Twilio)
- Sentiment analysis разговора (позитивный, нейтральный, негативный)
- Analytics dashboard для менеджеров (количество звонков, конверсия, средняя длительность)

---

## 15. Глоссарий

- **AMI** — Asterisk Manager Interface — TCP интерфейс для управления Asterisk
- **АТС** — Автоматическая телефонная станция (PBX)
- **CallerID** — Идентификатор звонящего (обычно номер телефона)
- **Extension** — Внутренний номер оператора в АТС
- **Hangup** — Событие завершения звонка
- **CRM** — Customer Relationship Management — система управления взаимоотношениями с клиентами
- **WebSocket** — Протокол для двусторонней real-time коммуникации между клиентом и сервером
- **WSS** — WebSocket Secure — WebSocket поверх TLS
- **OAuth 2.0** — Протокол авторизации для безопасного доступа к API
- **Refresh Token** — Долгоживущий токен для получения новых Access Token
- **Access Token** — Короткоживущий токен для доступа к API
- **ECS** — Elastic Container Service — сервис AWS для запуска контейнеров
- **Fargate** — Serverless compute engine для ECS
- **ALB** — Application Load Balancer — балансировщик нагрузки AWS
- **Redis** — In-memory database для кеширования и сессий
- **TTL** — Time To Live — время жизни данных в кеше
- **IaC** — Infrastructure as Code — код для определения инфраструктуры
- **CI/CD** — Continuous Integration / Continuous Deployment — автоматизация сборки и развертывания

---

## 16. Ссылки на документацию

### 16.1. Zoho CRM (AE регион)

- **API Console:** https://api-console.zoho.ae
- **OAuth Documentation:** https://www.zoho.com/crm/developer/docs/api/v3/oauth-overview.html
- **API v3 Overview:** https://www.zoho.com/crm/developer/docs/api/v3/
- **Search Records:** https://www.zoho.com/crm/developer/docs/api/v3/search-records.html
- **Insert Records:** https://www.zoho.com/crm/developer/docs/api/v3/insert-records.html
- **Activities API:** https://www.zoho.com/crm/developer/docs/api/v3/activities-overview.html
- **API Limits:** https://www.zoho.com/crm/developer/docs/api/v3/api-limits.html

### 16.2. Asterisk AMI

- **AMI Documentation:** https://docs.asterisk.org/Asterisk_20_Documentation/API_Documentation/AMI/
- **AMI Events:** https://docs.asterisk.org/Asterisk_20_Documentation/API_Documentation/AMI/AMI_Events/
- **Manager Configuration:** https://docs.asterisk.org/Configuration/Core-Configuration/Asterisk-Manager-Interface-AMI-Configuration/

### 16.3. AWS Documentation

- **ECS Fargate:** https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html
- **ElastiCache Redis:** https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/
- **Secrets Manager:** https://docs.aws.amazon.com/secretsmanager/latest/userguide/
- **CloudWatch:** https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/
- **Application Load Balancer:** https://docs.aws.amazon.com/elasticloadbalancing/latest/application/

### 16.4. Terraform

- **AWS Provider:** https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- **ECS Module:** https://registry.terraform.io/modules/terraform-aws-modules/ecs/aws/latest
- **VPC Module:** https://registry.terraform.io/modules/terraform-aws-modules/vpc/aws/latest

---

© 2026 Telephony-CRM Integration Project. Все права защищены.
