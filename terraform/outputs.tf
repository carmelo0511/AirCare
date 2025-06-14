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