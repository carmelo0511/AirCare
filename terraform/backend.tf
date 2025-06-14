terraform {
  backend "s3" {
    bucket = "aircare-frontend-bryannakache"
    key    = "terraform/terraform.tfstate"
    region = "ca-central-1"
  }
}
