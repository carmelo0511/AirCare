# main.tf
provider "aws" {
  region = var.region
}

resource "aws_s3_bucket" "frontend_bucket" {
  bucket        = var.s3_bucket_name
  force_destroy = true
  tags = {
    Project = "AirCare"
  }
}

resource "aws_s3_bucket_website_configuration" "frontend_website" {
  bucket = aws_s3_bucket.frontend_bucket.id
  index_document {
    suffix = "index.html"
  }
}

resource "aws_iam_role" "lambda_exec" {
  name = "lambda_exec_role"
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

resource "aws_lambda_function" "aircare_backend" {
  filename         = "../lambda/lambda.zip"
  function_name    = var.lambda_function_name
  role             = aws_iam_role.lambda_exec.arn
  handler          = "index.handler"
  runtime          = "nodejs18.x"
  timeout          = 10
  source_code_hash = filebase64sha256("../lambda/lambda.zip")
  environment {
    variables = {
      TABLE_NAME = var.dynamodb_table_name
      API_KEY    = var.openweather_api_key
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
    aws_api_gateway_method.air_method
  ]
}

resource "aws_api_gateway_stage" "prod" {
  stage_name    = var.stage_name
  rest_api_id   = aws_api_gateway_rest_api.aircare_api.id
  deployment_id = aws_api_gateway_deployment.aircare_deployment.id
}

resource "aws_lambda_permission" "apigw_lambda" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.aircare_backend.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "arn:aws:execute-api:${var.region}:${data.aws_caller_identity.current.account_id}:${aws_api_gateway_rest_api.aircare_api.id}/*/*"
}

data "aws_caller_identity" "current" {}

resource "aws_dynamodb_table" "history_table" {
  name         = var.dynamodb_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "timestamp"
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
      origin_access_identity = ""
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

  tags = {
    Project = "AirCare"
  }

  comment = var.cloudfront_comment
}
resource "null_resource" "invalidate_cloudfront" {
  triggers = {
    distribution_id = aws_cloudfront_distribution.aircare_distribution.id
    timestamp       = timestamp()  # force une exécution à chaque plan/apply
  }

  provisioner "local-exec" {
    command = <<EOT
      aws cloudfront create-invalidation \
        --distribution-id ${aws_cloudfront_distribution.aircare_distribution.id} \
        --paths "/*"
    EOT
  }
}
