variable "github_repo" {
  default = "https://github.com/futurehealth-global/futurehealth-global.git"
}

variable "app_directory" {
  default = "/opt/future-health"
}

variable "paystack_secret" {
  sensitive = true
}

variable "mongodb_uri" {
  sensitive = true
}

variable "jwt_secret" {
  sensitive = true
}

variable "email_password" {
  sensitive = true
}