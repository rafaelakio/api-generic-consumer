# API Generic Consumer

A fullstack web application built with **Next.js 14 (App Router)** that acts as a Mini Postman/Insomnia — letting authenticated users test any HTTP API with full control over method, headers, body, and SSL options.

---

## Architecture Overview

```
Browser → CloudFront → S3 (static)
                     → Next.js SSR/API Routes (ECS/Lambda)
                                ↓
                        AWS Secrets Manager
                                ↓
                         Target API (via OAuth2 client-credentials)
```

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React 18, Tailwind CSS |
| Backend (API Routes) | Next.js Route Handlers, Axios |
| Authentication | NextAuth.js + Azure AD (OAuth2/OIDC) |
| Secrets | AWS Secrets Manager |
| Infrastructure | Terraform (S3 + CloudFront + IAM) |
| Local Dev | Docker Compose + LocalStack |

---

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- AWS CLI (for Terraform and LocalStack)
- Terraform 1.6+ (for infrastructure)

---

## Running Locally

### 1. Clone and install dependencies

```bash
git clone <repo>
cd api-generic-consumer
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` — the defaults work for LocalStack. You only need to set `NEXTAUTH_SECRET` (any random string >= 32 chars):

```env
NEXTAUTH_SECRET=super-secret-random-string-at-least-32-chars
```

### 3. Start LocalStack + seed secrets

```bash
docker compose up localstack seed --wait
```

This starts LocalStack and runs `scripts/seed-localstack.sh`, which creates:
- `api-consumer/azure-ad` — Azure AD client credentials
- `api-consumer/api-credentials` — outbound API client credentials

> **Edit** `scripts/seed-localstack.sh` and replace the `REPLACE_ME` placeholders with your actual values before starting.

### 4. Start the Next.js dev server

```bash
npm run dev
```

Open http://localhost:3000.

### Running everything with Docker Compose

```bash
docker compose up --build
```

---

## Secrets Structure

All secrets live in **AWS Secrets Manager** as JSON strings.

### `api-consumer/azure-ad`

```json
{
  "clientId":     "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "clientSecret": "YOUR_CLIENT_SECRET",
  "tenantId":     "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

### `api-consumer/api-credentials`

```json
{
  "clientId":     "YOUR_CLIENT_ID",
  "clientSecret": "YOUR_CLIENT_SECRET",
  "tokenUrl":     "https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token",
  "scope":        "api://your-api-app-id/.default"
}
```

You can create additional per-API secrets following the same schema and reference them by name in the UI's **Auth** tab.

---

## Azure AD App Registration

1. Go to **Azure Portal > App Registrations > New Registration**.
2. Set redirect URI: `https://YOUR_DOMAIN/api/auth/callback/azure-ad` (and `http://localhost:3000/api/auth/callback/azure-ad` for local dev).
3. Under **Certificates & Secrets**, create a new client secret.
4. Under **API Permissions**, grant `openid`, `profile`, `email`.
5. Copy **Client ID**, **Client Secret**, and **Tenant ID** into the Secrets Manager secret.

---

## Deploying to AWS

### 1. Provision infrastructure

```bash
cd infra/terraform
terraform init
terraform plan -var="environment=prod"
terraform apply -var="environment=prod"
```

Key outputs:
- `s3_bucket_name` — upload the Next.js build here
- `cloudfront_distribution_id` — invalidate cache after deploy
- `app_task_role_arn` — attach to your ECS task or Lambda

### 2. Update secrets

```bash
aws secretsmanager update-secret \
  --secret-id "api-consumer/azure-ad" \
  --secret-string '{"clientId":"...","clientSecret":"...","tenantId":"..."}'
```

### 3. Build and sync to S3

```bash
npm run build

aws s3 sync .next/static s3://<BUCKET>/_next/static \
  --cache-control "public, max-age=31536000, immutable"

aws cloudfront create-invalidation \
  --distribution-id <DISTRIBUTION_ID> \
  --paths "/*"
```

### 4. Runtime environment variables

```
NEXTAUTH_URL=https://YOUR_DOMAIN
NEXTAUTH_SECRET=<strong-random-secret>
AWS_REGION=us-east-1
AWS_SECRET_NAME_AZURE=api-consumer/azure-ad
AWS_SECRET_NAME_API_CREDENTIALS=api-consumer/api-credentials
```

No `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` needed — the task IAM role provides credentials automatically.

---

## Project Structure

```
api-generic-consumer/
├── config/azuread.config.json        # Non-secret Azure AD config
├── infra/terraform/
│   ├── main.tf                       # Provider & backend
│   ├── variables.tf
│   ├── outputs.tf
│   ├── s3.tf                         # S3 origin + logs
│   ├── cloudfront.tf                 # CloudFront + OAC
│   ├── secrets.tf                    # Secrets Manager
│   └── iam.tf                        # Task role + policies
├── scripts/seed-localstack.sh        # LocalStack dev seed
├── src/
│   ├── app/
│   │   ├── api/auth/[...nextauth]/   # NextAuth handler
│   │   ├── api/proxy/route.ts        # HTTP proxy endpoint
│   │   ├── dashboard/page.tsx        # Protected main UI
│   │   └── login/page.tsx            # Azure AD sign-in
│   ├── auth/                         # NextAuth config + middleware
│   ├── components/ui/                # Button, Input, Select
│   ├── components/features/          # ApiTester, RequestForm, ResponseViewer, Navbar
│   ├── services/                     # secrets, oauth, http
│   ├── types/index.ts
│   └── middleware.ts                 # Route protection
├── docker-compose.yml
├── Dockerfile
└── .env.example
```

---

## Security Notes

- No credentials in code — all secrets flow through AWS Secrets Manager.
- SSL bypass is available for dev/testing; never use in production without understanding the risk.
- Certificates are loaded into memory via `https.Agent` and never written to disk.
- Every proxy request validates the session server-side before executing.

---

## License

MIT
