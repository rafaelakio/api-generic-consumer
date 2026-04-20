variable "aws_region" {
  description = "Primary AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment (dev | staging | prod)"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Prefix used for all resource names"
  type        = string
  default     = "api-consumer"
}

variable "domain_name" {
  description = "Custom domain for CloudFront (leave empty to use the default .cloudfront.net domain)"
  type        = string
  default     = ""
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN in us-east-1 for the custom domain (required when domain_name is set)"
  type        = string
  default     = ""
}

variable "azure_ad_secret_placeholder" {
  description = "Initial placeholder value for the Azure AD secret (update manually after provisioning)"
  type = object({
    clientId     = string
    clientSecret = string
    tenantId     = string
  })
  default = {
    clientId     = "REPLACE_ME"
    clientSecret = "REPLACE_ME"
    tenantId     = "REPLACE_ME"
  }
  sensitive = true
}

variable "api_credentials_placeholder" {
  description = "Initial placeholder value for the API client-credentials secret"
  type = object({
    clientId     = string
    clientSecret = string
    tokenUrl     = string
    scope        = string
  })
  default = {
    clientId     = "REPLACE_ME"
    clientSecret = "REPLACE_ME"
    tokenUrl     = "https://REPLACE_ME/oauth2/token"
    scope        = "REPLACE_ME"
  }
  sensitive = true
}
