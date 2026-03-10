# S3 backend for Terraform state (изолированные ресурсы erp-*).
# Для миграции на PostgreSQL — см. docs/SETUP.md

terraform {
  backend "s3" {
    bucket         = "erp-terraform-state-760221990195"
    key            = "erp/terraform.tfstate"
    region         = "me-central-1"
    dynamodb_table = "erp-terraform-lock"
    encrypt        = true
  }
}
