#!/bin/bash

echo "🚀 Importing all AirCare resources into Terraform..."

terraform import aws_lambda_function.aircare_backend aircare-backend
terraform import aws_api_gateway_rest_api.aircare_api vo8f9a9ghl
terraform import aws_cloudfront_distribution.aircare_distribution E1WRVG4O4ETFMN
terraform import aws_s3_bucket.frontend_bucket aircare-frontend-bryannakache
terraform import aws_dynamodb_table.history_table AirCareHistoryAQI
terraform import aws_cloudwatch_metric_alarm.lambda_alarm AirCareLambdaErrors

echo "✅ All imports completed."
echo "📦 Next: terraform plan -out=tfplan && terraform show -no-color tfplan > plan.txt"

