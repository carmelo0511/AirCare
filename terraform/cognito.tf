resource "aws_cognito_user_pool" "aircare" {
  name                     = var.cognito_user_pool_name
  auto_verified_attributes = ["email"]
}

resource "aws_cognito_user_pool_client" "aircare_client" {
  name                                 = var.cognito_user_pool_client_name
  user_pool_id                         = aws_cognito_user_pool.aircare.id
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["openid", "email"]
  callback_urls                        = ["https://${aws_cloudfront_distribution.aircare_distribution.domain_name}"]
  logout_urls                          = ["https://${aws_cloudfront_distribution.aircare_distribution.domain_name}"]
  supported_identity_providers         = ["COGNITO"]
}

resource "aws_cognito_user_pool_domain" "aircare_domain" {
  domain       = var.cognito_domain_prefix
  user_pool_id = aws_cognito_user_pool.aircare.id
}
