# PostgreSQL backend for Terraform state.
# Set PG_CONN_STR env var before terraform init, e.g.:
#   export PG_CONN_STR=postgres://user:pass@host:port/dbname?sslmode=require
# NEVER commit conn_str to git.

terraform {
  backend "pg" {}
}
