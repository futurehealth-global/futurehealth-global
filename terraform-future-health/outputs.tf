output "frontend_url" {
  value       = "http://${aws_instance.future_health.public_ip}"
  description = "Frontend application URL"
}

output "backend_api_url" {
  value       = "http://${aws_instance.future_health.public_ip}/api/health"
  description = "Backend API health check URL"
}

output "ssh_command" {
  value       = "ssh -i future-health-key.pem ubuntu@${aws_instance.future_health.public_ip}"
  description = "SSH command to access the server"
}

output "deployment_status" {
  value       = "Application deployed at: http://${aws_instance.future_health.public_ip}"
  description = "Deployment completion message"
}