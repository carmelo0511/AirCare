terraform {
  backend "s3" {
    bucket = var.state_bucket
    key    = "terraform/terraform.tfstate"
    region = var.region
  }
}
