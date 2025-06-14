output "cloudfront_url" {
  value = aws_cloudfront_distribution.aircare_distribution.domain_name
}

output "lambda_function_name" {
  value = data.aws_lambda_function.aircare_backend.function_name
}

output "api_gateway_url" {
  value = "https://${aws_api_gateway_rest_api.aircare_api.id}.execute-api.${var.region}.amazonaws.com/${var.stage_name}"
}

output "dynamodb_table_name" {
  value = aws_dynamodb_table.history_table.name
}

output "lambda_role_arn" {
  value = aws_iam_role.lambda_exec.arn
}

output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.aircare.id
}

output "cognito_user_pool_client_id" {
  value = aws_cognito_user_pool_client.aircare_client.id
}

output "cognito_domain" {
  value = aws_cognito_user_pool_domain.aircare_domain.domain
}
