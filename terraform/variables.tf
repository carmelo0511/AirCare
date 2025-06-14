variable "region" {
  description = "AWS Region"
  default     = "ca-central-1"
}

variable "s3_bucket_name" {
  description = "S3 bucket name for frontend"
}

variable "lambda_function_name" {
  description = "Lambda function name"
}

variable "dynamodb_table_name" {
  description = "DynamoDB table name"
}

variable "openweather_api_key" {
  description = "API key for OpenWeather"
}

variable "stage_name" {
  description = "API Gateway stage name"
  default     = "prod"
}

variable "api_name" {
  description = "API Gateway REST API name"
  default     = "AirCareAPI"
}

variable "cloudfront_comment" {
  description = "Comment for CloudFront distribution"
  default     = "CloudFront distribution for AirCare"
}
