# ── ECS / Lambda task role (attach to your compute resource) ──────────────────
resource "aws_iam_role" "app_task" {
  name = "${var.project_name}-${var.environment}-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowECSTasks"
        Effect = "Allow"
        Principal = {
          Service = ["ecs-tasks.amazonaws.com", "lambda.amazonaws.com"]
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

# ── Policy: read the two secrets ──────────────────────────────────────────────
resource "aws_iam_policy" "read_secrets" {
  name        = "${var.project_name}-${var.environment}-read-secrets"
  description = "Allow the app to read its Secrets Manager secrets"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ReadSecrets"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret",
        ]
        Resource = [
          aws_secretsmanager_secret.azure_ad.arn,
          aws_secretsmanager_secret.api_credentials.arn,
          # Pattern allows arbitrary per-API secrets:  <project>/<env>/api-credentials/<name>
          "arn:aws:secretsmanager:${var.aws_region}:*:secret:${var.project_name}/*",
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "app_read_secrets" {
  role       = aws_iam_role.app_task.name
  policy_arn = aws_iam_policy.read_secrets.arn
}

# ── Policy: write Next.js build artifacts to S3 (used by CI/CD) ───────────────
resource "aws_iam_policy" "deploy_s3" {
  name        = "${var.project_name}-${var.environment}-deploy-s3"
  description = "Allow CI/CD to sync Next.js static build to S3"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "SyncBuild"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket",
        ]
        Resource = [
          aws_s3_bucket.app.arn,
          "${aws_s3_bucket.app.arn}/*",
        ]
      },
      {
        Sid      = "InvalidateCFCache"
        Effect   = "Allow"
        Action   = ["cloudfront:CreateInvalidation"]
        Resource = aws_cloudfront_distribution.app.arn
      }
    ]
  })
}

# ── CloudWatch Logs policy (for Lambda / ECS) ──────────────────────────────────
resource "aws_iam_role_policy_attachment" "app_cw_logs" {
  role       = aws_iam_role.app_task.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
