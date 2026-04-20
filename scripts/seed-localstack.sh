#!/bin/sh
# Populates AWS Secrets Manager in LocalStack with the secrets the app needs.
# Edit the JSON values below to match your real credentials before running.

ENDPOINT="http://localstack:4566"
REGION="us-east-1"

AWS_CMD="aws --endpoint-url=${ENDPOINT} --region=${REGION}"

echo "Seeding LocalStack Secrets Manager…"

# ── Azure AD credentials ───────────────────────────────────────────────────────
$AWS_CMD secretsmanager create-secret \
  --name "api-consumer/azure-ad" \
  --secret-string '{
    "clientId":     "YOUR_AZURE_CLIENT_ID",
    "clientSecret": "YOUR_AZURE_CLIENT_SECRET",
    "tenantId":     "YOUR_AZURE_TENANT_ID"
  }' 2>/dev/null || \
$AWS_CMD secretsmanager update-secret \
  --secret-id "api-consumer/azure-ad" \
  --secret-string '{
    "clientId":     "YOUR_AZURE_CLIENT_ID",
    "clientSecret": "YOUR_AZURE_CLIENT_SECRET",
    "tenantId":     "YOUR_AZURE_TENANT_ID"
  }'

# ── Default API client credentials (client-credentials flow) ──────────────────
$AWS_CMD secretsmanager create-secret \
  --name "api-consumer/api-credentials" \
  --secret-string '{
    "clientId":     "YOUR_API_CLIENT_ID",
    "clientSecret": "YOUR_API_CLIENT_SECRET",
    "tokenUrl":     "https://YOUR_IDP/oauth2/token",
    "scope":        "api://YOUR_API/.default"
  }' 2>/dev/null || \
$AWS_CMD secretsmanager update-secret \
  --secret-id "api-consumer/api-credentials" \
  --secret-string '{
    "clientId":     "YOUR_API_CLIENT_ID",
    "clientSecret": "YOUR_API_CLIENT_SECRET",
    "tokenUrl":     "https://YOUR_IDP/oauth2/token",
    "scope":        "api://YOUR_API/.default"
  }'

echo "LocalStack secrets seeded successfully."
