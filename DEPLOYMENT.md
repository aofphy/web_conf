# Deployment Guide

This guide covers the deployment of the International Conference Website application in various environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Local Development](#local-development)
4. [Staging Deployment](#staging-deployment)
5. [Production Deployment](#production-deployment)
6. [Monitoring and Maintenance](#monitoring-and-maintenance)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **Docker**: Version 20.10 or higher
- **Docker Compose**: Version 2.0 or higher
- **Node.js**: Version 18 or higher (for local development)
- **PostgreSQL**: Version 15 or higher (if not using Docker)
- **Redis**: Version 7 or higher (if not using Docker)

### Hardware Requirements

#### Minimum (Development/Staging)
- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 20GB free space
- **Network**: Stable internet connection

#### Recommended (Production)
- **CPU**: 4+ cores
- **RAM**: 8GB+
- **Storage**: 100GB+ SSD
- **Network**: High-speed internet with low latency

## Environment Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd international-conference-website
```

### 2. Environment Configuration

Copy the appropriate environment file:

```bash
# For development
cp .env.example .env

# For staging
cp .env.staging .env.staging

# For production
cp .env.production .env.production
```

### 3. Configure Environment Variables

Edit the environment files with your specific configuration:

#### Critical Variables to Change

```bash
# Database
DB_PASSWORD=your_secure_database_password
DB_USER=your_database_user

# Redis
REDIS_PASSWORD=your_secure_redis_password

# JWT
JWT_SECRET=your_very_secure_jwt_secret_at_least_32_characters

# Email (SUT Configuration)
SMTP_HOST=smtp.gmail.com
SMTP_USER=anscse29@g.sut.ac.th
SMTP_PASS=your_gmail_app_password
EMAIL_FROM=anscse29@g.sut.ac.th

# Domain
FRONTEND_URL=https://yourdomain.com

# Payment (Production only)
BANK_NAME=Your Bank Name
ACCOUNT_NAME=Conference Account
ACCOUNT_NUMBER=your_account_number
SWIFT_CODE=your_swift_code
```

## Local Development

### Using Docker (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Manual Setup

#### Backend

```bash
cd backend
npm install
npm run db:setup  # Run migrations and seeds
npm run dev
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Database Setup

```bash
# Run migrations
./scripts/migrate.sh development

# Seed database
./scripts/seed.sh development
```

## Staging Deployment

### 1. Prepare Environment

```bash
# Ensure staging environment file exists
cp .env.staging .env.staging
# Edit with staging-specific values
```

### 2. Deploy to Staging

```bash
# Build and deploy
./scripts/deploy.sh staging deploy

# Check status
./scripts/deploy.sh staging status

# View logs
./scripts/deploy.sh staging logs
```

### 3. Run Tests

```bash
# Backend tests
cd backend
npm run test

# Frontend tests
cd frontend
npm run test

# End-to-end tests
npm run test:e2e
```

## Production Deployment

### 1. Pre-deployment Checklist

- [ ] All environment variables configured
- [ ] SSL certificates obtained and configured
- [ ] Database backups scheduled
- [ ] Monitoring tools configured
- [ ] DNS records configured
- [ ] Firewall rules configured
- [ ] Load balancer configured (if applicable)

### 2. SSL Certificate Setup

```bash
# Create SSL directory
mkdir -p nginx/ssl

# Copy your SSL certificates
cp your-cert.pem nginx/ssl/cert.pem
cp your-key.pem nginx/ssl/key.pem

# Set proper permissions
chmod 600 nginx/ssl/key.pem
chmod 644 nginx/ssl/cert.pem
```

### 3. Production Deployment

```bash
# Deploy to production
./scripts/deploy.sh production deploy

# Verify deployment
./scripts/health-check.sh production

# Monitor logs
./scripts/deploy.sh production logs
```

### 4. Post-deployment Verification

1. **Health Checks**: Verify all services are running
2. **Functionality Tests**: Test critical user flows
3. **Performance Tests**: Check response times
4. **Security Tests**: Verify SSL and security headers

## Monitoring and Maintenance

### Health Monitoring

```bash
# Check system health
./scripts/health-check.sh production

# View performance metrics
curl http://localhost:5000/metrics

# Prometheus metrics
curl http://localhost:5000/metrics/prometheus
```

### Log Management

```bash
# View application logs
docker-compose -f docker-compose.prod.yml logs -f backend

# View nginx logs
docker-compose -f docker-compose.prod.yml logs -f nginx

# View database logs
docker-compose -f docker-compose.prod.yml logs -f postgres
```

### Database Maintenance

```bash
# Create database backup
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U $DB_USER $DB_NAME > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore database backup
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U $DB_USER $DB_NAME < backup_file.sql

# Run database maintenance
docker-compose -f docker-compose.prod.yml exec postgres psql -U $DB_USER $DB_NAME -c "VACUUM ANALYZE;"
```

### Performance Optimization

```bash
# Clean up old Docker images
./scripts/deploy.sh production cleanup

# Refresh materialized views
docker-compose -f docker-compose.prod.yml exec postgres psql -U $DB_USER $DB_NAME -c "SELECT refresh_stats_views();"

# Clear Redis cache
docker-compose -f docker-compose.prod.yml exec redis redis-cli FLUSHALL
```

## Scaling

### Horizontal Scaling

```bash
# Scale backend services
docker-compose -f docker-compose.prod.yml up -d --scale backend=3

# Scale frontend services
docker-compose -f docker-compose.prod.yml up -d --scale frontend=2
```

### Load Balancer Configuration

Configure your load balancer to distribute traffic across multiple instances:

- **Backend**: Round-robin across backend instances
- **Frontend**: Round-robin across frontend instances
- **Health Checks**: Use `/health` endpoints

## Backup Strategy

### Automated Backups

```bash
# Add to crontab for daily backups
0 2 * * * /path/to/project/scripts/backup.sh production
```

### Backup Script Example

```bash
#!/bin/bash
# Create backup script
cat > scripts/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

# Database backup
docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump -U $DB_USER $DB_NAME > "$BACKUP_DIR/database.sql"

# Files backup
tar -czf "$BACKUP_DIR/uploads.tar.gz" backend/uploads/

# Configuration backup
cp .env.production "$BACKUP_DIR/"

echo "Backup completed: $BACKUP_DIR"
EOF

chmod +x scripts/backup.sh
```

## Security Considerations

### SSL/TLS Configuration

- Use strong SSL certificates (RSA 2048-bit minimum)
- Configure HSTS headers
- Disable weak cipher suites
- Enable OCSP stapling

### Database Security

- Use strong passwords
- Enable SSL connections
- Restrict network access
- Regular security updates

### Application Security

- Keep dependencies updated
- Regular security audits
- Input validation
- Rate limiting
- CORS configuration

## Troubleshooting

### Common Issues

#### Service Won't Start

```bash
# Check container logs
docker-compose -f docker-compose.prod.yml logs service-name

# Check container status
docker-compose -f docker-compose.prod.yml ps

# Restart specific service
docker-compose -f docker-compose.prod.yml restart service-name
```

#### Database Connection Issues

```bash
# Check database connectivity
docker-compose -f docker-compose.prod.yml exec postgres pg_isready

# Check database logs
docker-compose -f docker-compose.prod.yml logs postgres

# Reset database connection
docker-compose -f docker-compose.prod.yml restart postgres
```

#### Performance Issues

```bash
# Check system resources
docker stats

# Check application metrics
curl http://localhost:5000/metrics

# Analyze slow queries
docker-compose -f docker-compose.prod.yml exec postgres psql -U $DB_USER $DB_NAME -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"
```

### Emergency Procedures

#### Rollback Deployment

```bash
# Stop current deployment
docker-compose -f docker-compose.prod.yml down

# Restore from backup
./scripts/restore.sh production backup_date

# Start services
docker-compose -f docker-compose.prod.yml up -d
```

#### Database Recovery

```bash
# Stop application
docker-compose -f docker-compose.prod.yml stop backend

# Restore database
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U $DB_USER $DB_NAME < backup.sql

# Start application
docker-compose -f docker-compose.prod.yml start backend
```

## Support and Maintenance

### Regular Maintenance Tasks

- **Daily**: Check health status, review logs
- **Weekly**: Update dependencies, security patches
- **Monthly**: Database maintenance, performance review
- **Quarterly**: Security audit, disaster recovery test

### Monitoring Alerts

Set up alerts for:
- Service downtime
- High CPU/memory usage
- Database connection issues
- Disk space warnings
- SSL certificate expiration

### Contact Information

For deployment issues or questions:
- **Technical Lead**: [email]
- **DevOps Team**: [email]
- **Emergency Contact**: [phone]

---

## Quick Reference

### Useful Commands

```bash
# Deploy to production
./scripts/deploy.sh production deploy

# Check health
./scripts/health-check.sh production

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Scale services
docker-compose -f docker-compose.prod.yml up -d --scale backend=2

# Backup database
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U $DB_USER $DB_NAME > backup.sql

# Clean up
./scripts/deploy.sh production cleanup
```

### Environment URLs

- **Development**: http://localhost:3000
- **Staging**: https://staging-conference.yourdomain.com
- **Production**: https://conference.yourdomain.com

### Default Ports

- **Frontend**: 3000 (development), 80/443 (production)
- **Backend**: 5000
- **Database**: 5432
- **Redis**: 6379
- **Monitoring**: 9090 (Prometheus), 3001 (Grafana)