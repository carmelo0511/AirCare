provider "aws" {
  region = var.region
}

data "aws_caller_identity" "current" {}

resource "aws_s3_bucket" "frontend_bucket" {
  bucket        = var.s3_bucket_name
  force_destroy = true
  tags = {
    Project = "AirCare"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "frontend_bucket" {
  bucket = aws_s3_bucket.frontend_bucket.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_cloudfront_origin_access_identity" "oai" {
  comment = "AirCare OAI"
}

resource "aws_s3_bucket_policy" "frontend_policy" {
  bucket = aws_s3_bucket.frontend_bucket.id
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Principal = {
          AWS = aws_cloudfront_origin_access_identity.oai.iam_arn
        },
        Action   = "s3:GetObject",
        Resource = "${aws_s3_bucket.frontend_bucket.arn}/*"
      }
    ]
  })
}
resource "aws_s3_bucket_website_configuration" "frontend_website" {
  bucket = aws_s3_bucket.frontend_bucket.id

  index_document {
    suffix = "index.html"
  }
}

resource "aws_iam_role" "lambda_exec" {
  name = var.lambda_role_name
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Action = "sts:AssumeRole",
      Principal = {
        Service = "lambda.amazonaws.com"
      },
      Effect = "Allow",
      Sid    = ""
    }]
  })
}

resource "aws_iam_role_policy" "lambda_logs" {
  name = "lambda-logs-policy"
  role = aws_iam_role.lambda_exec.id
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ],
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow",
        Action = [
          "dynamodb:PutItem",
          "dynamodb:Query"
        ],
        Resource = aws_dynamodb_table.history_table.arn
      }
    ]
  })
}
resource "aws_lambda_function" "aircare_backend" {
  filename      = "../lambda.zip"
  function_name = var.lambda_function_name
  role          = aws_iam_role.lambda_exec.arn
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  timeout       = 10
  # Lambda package may not exist when running validation in CI/local.
  # Use try() so validation succeeds even if the zip file is absent.
  source_code_hash = try(filebase64sha256("../lambda.zip"), "")
  environment {
    variables = {
      TABLE_NAME         = var.dynamodb_table_name
      OPENWEATHER_APIKEY = var.openweather_api_key
    }
  }
  depends_on = [aws_iam_role.lambda_exec]
}

resource "aws_api_gateway_rest_api" "aircare_api" {
  name        = var.api_name
  description = "API for AirCare backend"
}

resource "aws_api_gateway_integration" "air_integration" {
  rest_api_id             = aws_api_gateway_rest_api.aircare_api.id
  resource_id             = aws_api_gateway_resource.air_resource.id
  http_method             = aws_api_gateway_method.air_method.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.aircare_backend.invoke_arn
}

resource "aws_api_gateway_deployment" "aircare_deployment" {
  rest_api_id = aws_api_gateway_rest_api.aircare_api.id

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [
    aws_api_gateway_integration.air_integration,
    aws_api_gateway_method.air_method,
    aws_api_gateway_integration.geo_direct,
    aws_api_gateway_method.geo_direct,
    aws_api_gateway_integration.geo_reverse,
    aws_api_gateway_method.geo_reverse,
    aws_api_gateway_integration.history,
    aws_api_gateway_method.history
  ]
}

resource "aws_api_gateway_stage" "prod" {
  stage_name    = var.stage_name
  rest_api_id   = aws_api_gateway_rest_api.aircare_api.id
  deployment_id = aws_api_gateway_deployment.aircare_deployment.id
}

resource "aws_lambda_permission" "apigw_lambda" {
  statement_id  = "AllowAPIGatewayInvoke-v2"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.aircare_backend.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "arn:aws:execute-api:${var.region}:${data.aws_caller_identity.current.account_id}:${aws_api_gateway_rest_api.aircare_api.id}/*/*"
}

resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${aws_lambda_function.aircare_backend.function_name}"
  retention_in_days = 14
}

resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "aircare-error-alarm"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 60
  statistic           = "Sum"
  threshold           = 1
  dimensions = {
    FunctionName = aws_lambda_function.aircare_backend.function_name
  }
  alarm_description = "Alarm if AirCare lambda errors >=1 in a minute"
}

resource "aws_dynamodb_table" "history_table" {
  name         = var.dynamodb_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "location"
  range_key    = "timestamp"

  attribute {
    name = "location"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "S"
  }

  tags = {
    Project = "AirCare"
  }
}

resource "aws_cloudfront_distribution" "aircare_distribution" {
  origin {
    domain_name = aws_s3_bucket.frontend_bucket.bucket_regional_domain_name
    origin_id   = "s3-aircare"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.oai.cloudfront_access_identity_path
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "s3-aircare"

    forwarded_values {
      query_string = true
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  comment = var.cloudfront_comment

  tags = {
    Project = "AirCare"
  }
}

resource "aws_api_gateway_resource" "air_resource" {
  rest_api_id = aws_api_gateway_rest_api.aircare_api.id
  parent_id   = aws_api_gateway_rest_api.aircare_api.root_resource_id
  path_part   = "air"
}

resource "aws_api_gateway_method" "air_method" {
  rest_api_id   = aws_api_gateway_rest_api.aircare_api.id
  resource_id   = aws_api_gateway_resource.air_resource.id
  http_method   = "GET"
  authorization = "NONE"
}
resource "aws_api_gateway_resource" "geo" {
  rest_api_id = aws_api_gateway_rest_api.aircare_api.id
  parent_id   = aws_api_gateway_rest_api.aircare_api.root_resource_id
  path_part   = "geo"
}

resource "aws_api_gateway_resource" "geo_direct" {
  rest_api_id = aws_api_gateway_rest_api.aircare_api.id
  parent_id   = aws_api_gateway_resource.geo.id
  path_part   = "direct"
}

resource "aws_api_gateway_method" "geo_direct" {
  rest_api_id   = aws_api_gateway_rest_api.aircare_api.id
  resource_id   = aws_api_gateway_resource.geo_direct.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "geo_direct" {
  rest_api_id             = aws_api_gateway_rest_api.aircare_api.id
  resource_id             = aws_api_gateway_resource.geo_direct.id
  http_method             = aws_api_gateway_method.geo_direct.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.aircare_backend.invoke_arn
}

resource "aws_api_gateway_resource" "geo_reverse" {
  rest_api_id = aws_api_gateway_rest_api.aircare_api.id
  parent_id   = aws_api_gateway_resource.geo.id
  path_part   = "reverse"
}

resource "aws_api_gateway_method" "geo_reverse" {
  rest_api_id   = aws_api_gateway_rest_api.aircare_api.id
  resource_id   = aws_api_gateway_resource.geo_reverse.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "geo_reverse" {
  rest_api_id             = aws_api_gateway_rest_api.aircare_api.id
  resource_id             = aws_api_gateway_resource.geo_reverse.id
  http_method             = aws_api_gateway_method.geo_reverse.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.aircare_backend.invoke_arn
}

resource "aws_api_gateway_resource" "history" {
  rest_api_id = aws_api_gateway_rest_api.aircare_api.id
  parent_id   = aws_api_gateway_rest_api.aircare_api.root_resource_id
  path_part   = "history"
}

resource "aws_api_gateway_method" "history" {
  rest_api_id   = aws_api_gateway_rest_api.aircare_api.id
  resource_id   = aws_api_gateway_resource.history.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "history" {
  rest_api_id             = aws_api_gateway_rest_api.aircare_api.id
  resource_id             = aws_api_gateway_resource.history.id
  http_method             = aws_api_gateway_method.history.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.aircare_backend.invoke_arn
}
