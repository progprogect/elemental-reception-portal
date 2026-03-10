variable "project_name" {
  description = "Project name prefix for resources"
  type        = string
  default     = "erp"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "me-central-1"
}
