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

resource "aws_api_gateway_resource" "geo_resource" {
  rest_api_id = aws_api_gateway_rest_api.aircare_api.id
  parent_id   = aws_api_gateway_resource.air_resource.id
  path_part   = "geo"
}

resource "aws_api_gateway_method" "geo_method" {
  rest_api_id   = aws_api_gateway_rest_api.aircare_api.id
  resource_id   = aws_api_gateway_resource.geo_resource.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_resource" "direct_resource" {
  rest_api_id = aws_api_gateway_rest_api.aircare_api.id
  parent_id   = aws_api_gateway_resource.geo_resource.id
  path_part   = "direct"
}

resource "aws_api_gateway_resource" "reverse_resource" {
  rest_api_id = aws_api_gateway_rest_api.aircare_api.id
  parent_id   = aws_api_gateway_resource.geo_resource.id
  path_part   = "reverse"
}

resource "aws_api_gateway_resource" "history_resource" {
  rest_api_id = aws_api_gateway_rest_api.aircare_api.id
  parent_id   = aws_api_gateway_rest_api.aircare_api.root_resource_id
  path_part   = "history"
}
