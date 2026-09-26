resource "aws_instance" "future_health" {
  ami                    = "ami-0c55b159cbfafe1f0"  # Ubuntu 22.04
  instance_type          = "t2.micro"
  vpc_security_group_ids = [aws_security_group.future_health_sg.id]
  
  # Add tags for identification
  tags = {
    Name    = "future-health-production"
    Project = "Future-Health"
    Managed = "Terraform"
  }

  # Root volume
  root_block_device {
    volume_size = 20
    volume_type = "gp3"
    tags = {
      Name = "future-health-root"
    }
  }

  # IMPORTANT: This user_data runs on FIRST BOOT ONLY
  user_data = <<-EOF
              #!/bin/bash
              # Log everything
              exec > /var/log/user-data.log 2>&1
              
              echo "🚀 Starting Future Health deployment..."
              
              # Update system
              apt update && apt upgrade -y
              
              # Install dependencies
              apt install -y nodejs npm git nginx
              npm install -g pm2
              
              # Create app directory
              mkdir -p ${var.app_directory}
              chown -R ubuntu:ubuntu ${var.app_directory}
              
              # Clone your repo
              git clone ${var.github_repo} ${var.app_directory}
              
              echo "✅ System setup completed. Run 'terraform apply' to deploy app."
              EOF
}

# Null resource for APPLICATION DEPLOYMENT (runs on every terraform apply)
resource "null_resource" "deploy_application" {
  depends_on = [aws_instance.future_health]

  # Triggers - will re-run when these change
  triggers = {
    instance_id    = aws_instance.future_health.id
    config_hash    = sha1(join("", [var.paystack_secret, var.mongodb_uri, var.jwt_secret]))
    frontend_hash  = filemd5("${path.module}/../frontend/index.html")  # If frontend files are in parent dir
    backend_hash   = filemd5("${path.module}/../backend/package.json") # If backend files are in parent dir
  }

  # Connection to the EC2 instance
  connection {
    type        = "ssh"
    host        = aws_instance.future_health.public_ip
    user        = "ubuntu"
    private_key = file("${path.module}/future-health-key.pem")  # You need to save your .pem file here
    timeout     = "10m"
  }

  # PROVISIONER 1: Deploy Frontend
  provisioner "file" {
    source      = "../frontend/"  # Your frontend files directory
    destination = "${var.app_directory}/frontend/"
  }

  # PROVISIONER 2: Deploy Backend
  provisioner "file" {
    source      = "../backend/"   # Your backend files directory
    destination = "${var.app_directory}/backend/"
  }

  # PROVISIONER 3: Create .env file with secrets
  provisioner "remote-exec" {
    inline = [
      "cat > ${var.app_directory}/backend/.env << 'ENVFILE'",
      "NODE_ENV=production",
      "PORT=3000",
      "PAYSTACK_SECRET_KEY=${var.paystack_secret}",
      "MONGODB_URI=${var.mongodb_uri}",
      "JWT_SECRET=${var.jwt_secret}",
      "EMAIL_PASS=${var.email_password}",
      "FRONTEND_URL=http://${aws_instance.future_health.public_ip}",
      "ENVFILE"
    ]
  }

  # PROVISIONER 4: Install dependencies and start app
  provisioner "remote-exec" {
    inline = [
      "echo '📦 Installing Node.js dependencies...'",
      "cd ${var.app_directory}/backend && npm install --only=production",
      
      "echo '🔄 Setting up Nginx...'",
      "sudo rm -f /etc/nginx/sites-enabled/default",
      "sudo tee /etc/nginx/sites-available/future-health > /dev/null << 'NGINXCONFIG'",
      "server {",
      "    listen 80;",
      "    server_name _;",
      "    root ${var.app_directory}/frontend;",
      "    index index.html;",
      "    ",
      "    location / {",
      "        try_files \\$uri \\$uri/ /index.html;",
      "    }",
      "    ",
      "    location /api/ {",
      "        proxy_pass http://localhost:3000;",
      "        proxy_http_version 1.1;",
      "        proxy_set_header Upgrade \\$http_upgrade;",
      "        proxy_set_header Connection 'upgrade';",
      "        proxy_set_header Host \\$host;",
      "        proxy_cache_bypass \\$http_upgrade;",
      "    }",
      "}",
      "NGINXCONFIG",
      "sudo ln -sf /etc/nginx/sites-available/future-health /etc/nginx/sites-enabled/",
      "sudo nginx -t && sudo systemctl restart nginx",
      
      "echo '🚀 Starting Future Health application...'",
      "cd ${var.app_directory}/backend",
      "pm2 delete future-health 2>/dev/null || true",
      "pm2 start server.js --name future-health",
      "pm2 save",
      "pm2 startup",
      
      "echo '✅ Future Health deployment completed!'",
      "echo '🌐 Frontend: http://${aws_instance.future_health.public_ip}'",
      "echo '🔧 Backend API: http://${aws_instance.future_health.public_ip}/api/health'"
    ]
  }
}

resource "aws_security_group" "future_health_sg" {
  name        = "future-health-sg"
  description = "Security group for Future Health"
}