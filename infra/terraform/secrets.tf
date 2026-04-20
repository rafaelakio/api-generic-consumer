# ── Azure AD secret ───────────────────────────────────────────────────────────
resource "aws_secretsmanager_secret" "azure_ad" {
  name                    = "${var.project_name}/azure-ad"
  description             = "Azure AD OAuth2 credentials for ${var.project_name}"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "azure_ad" {
  secret_id = aws_secretsmanager_secret.azure_ad.id
  secret_string = jsonencode(var.azure_ad_secret_placeholder)

  lifecycle {
    # Prevent Terraform from overwriting values updated via console / CI
    ignore_changes = [secret_string]
  }
}

# ── Default API client credentials ────────────────────────────────────────────
resource "aws_secretsmanager_secret" "api_credentials" {
  name                    = "${var.project_name}/api-credentials"
  description             = "Default OAuth2 client-credentials for outbound API calls"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "api_credentials" {
  secret_id     = aws_secretsmanager_secret.api_credentials.id
  secret_string = jsonencode(var.api_credentials_placeholder)

  lifecycle {
    ignore_changes = [secret_string]
  }
}
