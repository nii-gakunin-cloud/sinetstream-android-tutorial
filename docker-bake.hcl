variable "IMAGE" {
  default = "harbor.vcloud.nii.ac.jp/sinetstream/android-tutorial"
}

variable "TAGS" {
  default = formatdate("YYYYMMDD", timestamp())
}

group "default" {
  targets = ["tutorial"]
}

target "tutorial" {
  dockerfile = "Dockerfile"
  tags       = [for tag in split(",", TAGS) : "${IMAGE}:${tag}"]
  platforms  = ["linux/amd64", "linux/arm64"]
  output     = ["type=registry"]
}
