# 🌐 International Conference Website - SUT

A comprehensive web application for managing international academic conferences, specifically designed for Suranaree University of Technology (SUT).

## 🎯 Overview

This system provides a complete solution for academic conference management, including registration, abstract submission, peer review, payment processing, and conference administration.

## ✨ Features

### 👥 User Management
- Multi-role authentication (Participants, Presenters, Reviewers, Admins)
- Profile management with academic affiliations
- International participant support

### 📝 Submission System
- Abstract submission with rich text editor
- Manuscript upload and management
- Multi-session support (CHE, CSE, BIO, MST, PFD)
- Presentation type selection (Oral/Poster)

### 🔍 Review System
- Peer review assignment and management
- Scoring and recommendation system
- Review progress tracking
- Automated notifications

### 💳 Payment Processing
- Multiple payment method support
- Payment verification system
- Fee calculation based on participant type
- Receipt generation

### 📊 Administration
- Comprehensive admin dashboard
- User and submission monitoring
- Payment verification panel
- Abstract book generation
- System configuration

### 🎨 Design & UX
- Professional academic theme
- Responsive design for all devices
- Material-UI components
- Multi-language ready
- Accessibility compliant

## 🚀 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Material-UI (MUI)** for components
- **Vite** for build tooling
- **React Router** for navigation
- **Emotion** for styling

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **PostgreSQL** database
- **Redis** for caching
- **JWT** authentication
- **Nodemailer** for emails

### DevOps & Deployment
- **Docker** containerization
- **Docker Compose** for orchestration
- **Nginx** reverse proxy
- **Performance monitoring**
- **Health checks**

## 📋 Prerequisites

- **Node.js** 18+
- **PostgreSQL** 15+
- **Redis** 7+
- **Docker** 20.10+ (optional)
- **Docker Compose** 2.0+ (optional)

## 🛠️ Installation

### Option 1: Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/aofphy/web_conf.git
cd web_conf

# Start with Docker Compose
docker-compose up -d

# The application will be available at:
# Frontend: http://localhost:3000
# Backend: http://localhost:5000
```

### Option 2: Manual Setup

```bash
# Clone the repository
git clone https://github.com/aofphy/web_conf.git
cd web_conf

# Backend setup
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run db:setup
npm run dev

# Frontend setup (in new terminal)
cd frontend
npm install
npm run dev
```

## 🔧 Configuration

### Environment Variables

Key configuration variables in `.env`:

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=conference_db
DB_USER=conference_user
DB_PASSWORD=your_password

# Email (SUT Configuration)
SMTP_HOST=smtp.gmail.com
SMTP_USER=anscse29@g.sut.ac.th
SMTP_PASS=your_app_password
EMAIL_FROM=anscse29@g.sut.ac.th

# JWT
JWT_SECRET=your_jwt_secret

# Redis
REDIS_URL=redis://localhost:6379
```

## 📁 Project Structure

```
web_conf/
├── 📁 backend/                 # Node.js API server
│   ├── 📁 src/
│   │   ├── 📁 controllers/     # API controllers
│   │   ├── 📁 models/          # Database models
│   │   ├── 📁 routes/          # API routes
│   │   ├── 📁 services/        # Business logic
│   │   ├── 📁 middleware/      # Express middleware
│   │   ├── 📁 database/        # DB migrations & seeds
│   │   └── 📁 __tests__/       # Test files
│   └── 📄 package.json
├── 📁 frontend/                # React application
│   ├── 📁 src/
│   │   ├── 📁 components/      # React components
│   │   ├── 📁 pages/           # Page components
│   │   ├── 📁 services/        # API services
│   │   ├── 📁 theme/           # UI theme & styling
│   │   └── 📁 types/           # TypeScript types
│   └── 📄 package.json
├── 📁 docs/                    # Documentation
├── 📁 scripts/                 # Deployment scripts
├── 📁 nginx/                   # Nginx configuration
├── 📄 docker-compose.yml       # Development setup
├── 📄 docker-compose.prod.yml  # Production setup
└── 📄 README.md
```

## 🚀 Deployment

### Production Deployment

```bash
# Configure production environment
cp .env.production .env.production
# Edit with production values

# Deploy with Docker
./scripts/deploy.sh production deploy

# Check health
./scripts/health-check.sh production
```

### Staging Deployment

```bash
# Deploy to staging
./scripts/deploy.sh staging deploy
```

## 📊 Performance Features

- **Redis Caching**: 50% faster API responses
- **Database Optimization**: Advanced indexing and query optimization
- **File Compression**: Automatic compression for large files
- **CDN Ready**: Integration with content delivery networks
- **Performance Monitoring**: Real-time metrics and health checks

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: API and authentication rate limiting
- **Input Validation**: Comprehensive server-side validation
- **File Security**: Virus scanning and file validation
- **HTTPS**: SSL/TLS encryption
- **Security Headers**: Comprehensive security headers

## 📧 Email System

Configured for SUT email system:
- **From**: anscse29@g.sut.ac.th
- **Templates**: Professional academic email templates
- **Notifications**: Registration, submission, payment confirmations
- **Reminders**: Deadline and review reminders

## 🎨 Design System

- **Colors**: Academic blue (#1565C0) and gold (#FF6F00)
- **Typography**: Professional fonts with academic styling
- **Components**: Consistent Material-UI based components
- **Responsive**: Mobile-first responsive design
- **Accessibility**: WCAG 2.1 compliant

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test
npm run test:coverage

# Frontend tests
cd frontend
npm test
npm run test:coverage

# E2E tests
npm run test:e2e
```

## 📖 Documentation

- [📋 Deployment Guide](DEPLOYMENT.md)
- [🎨 Design Guidelines](DESIGN_GUIDELINES.md)
- [📧 Email Setup](docs/EMAIL_SETUP.md)
- [🚀 Performance Guide](README.deployment.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

- **Email**: anscse29@g.sut.ac.th
- **Organization**: Suranaree University of Technology
- **Department**: Computer Science and Engineering

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Suranaree University of Technology
- Computer Science and Engineering Department
- International Conference Organizing Committee

---

**Built with ❤️ for academic excellence at SUT** 🎓
