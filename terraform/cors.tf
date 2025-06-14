resource "aws_api_gateway_method" "air_options" {
  rest_api_id   = aws_api_gateway_rest_api.aircare_api.id
  resource_id   = aws_api_gateway_resource.air_resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_method_response" "air_options_response" {
  rest_api_id = aws_api_gateway_rest_api.aircare_api.id
  resource_id = aws_api_gateway_resource.air_resource.id
  http_method = aws_api_gateway_method.air_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }

  response_models = {
    "application/json" = "Empty"
  }
}

resource "aws_api_gateway_integration" "air_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.aircare_api.id
  resource_id = aws_api_gateway_resource.air_resource.id
  http_method = aws_api_gateway_method.air_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_integration_response" "air_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.aircare_api.id
  resource_id = aws_api_gateway_resource.air_resource.id
  http_method = aws_api_gateway_method.air_options.http_method
  status_code = aws_api_gateway_method_response.air_options_response.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }

  response_templates = {
    "application/json" = ""
  }
}
