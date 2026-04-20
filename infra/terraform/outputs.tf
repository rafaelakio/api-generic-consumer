output "s3_bucket_name" {
  description = "Name of the S3 bucket hosting the static build"
  value       = aws_s3_bucket.app.id
}

output "s3_bucket_arn" {
  description = "ARN of the S3 bucket"
  value       = aws_s3_bucket.app.arn
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID (needed for cache invalidation)"
  value       = aws_cloudfront_distribution.app.id
}

output "cloudfront_domain_name" {
  description = "Public CloudFront URL"
  value       = "https://${aws_cloudfront_distribution.app.domain_name}"
}

output "azure_ad_secret_arn" {
  description = "ARN of the Azure AD credentials secret"
  value       = aws_secretsmanager_secret.azure_ad.arn
}

output "api_credentials_secret_arn" {
  description = "ARN of the default API credentials secret"
  value       = aws_secretsmanager_secret.api_credentials.arn
}

output "app_task_role_arn" {
  description = "IAM role ARN to attach to ECS tasks / Lambda functions"
  value       = aws_iam_role.app_task.arn
}
