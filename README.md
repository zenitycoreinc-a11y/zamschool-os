# ZamSchool OS

A comprehensive school management system built with modern web technologies to streamline educational institution operations.

## 🎯 Overview

ZamSchool OS is a full-featured school management platform supporting multiple user roles including Admin, Teacher, Student, Parent, and Payments/Bursar. The system provides real-time dashboards, secure authentication, and comprehensive management tools for classes, attendance, assignments, results, communications, events, and finances.

## ✨ Features

### Core Functionality
- **Multi-Role Authentication** - Secure OTP-based authentication with role-specific access control
- **Role-Based Dashboards** - Real-time statistics and insights tailored to each user role
- **Class & Subject Management** - Complete curriculum organization and tracking
- **Attendance System** - Daily tracking with automated parent notifications
- **Assignment Management** - Creation, submission, grading, and feedback workflow
- **Results & Grading** - Comprehensive grading system with analytics and reporting
- **Messaging System** - Internal communication between all stakeholders
- **Events Calendar** - School events scheduling and management
- **Finance Management** - Payment tracking, invoicing, and financial reports
- **Bulk Import** - CSV import for students, staff, and data migration

### User Roles
- **Admin** - Full system oversight, user management, and institutional settings
- **Teacher** - Class management, attendance, assignments, grading, and parent communication
- **Student** - View assignments, submit work, check results, and track attendance
- **Parent** - Monitor child's progress, attendance, results, and school communications
- **Payments/Bursar** - Fee management, payment processing, and financial reporting

## 🛠️ Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **TailwindCSS 4** - Utility-first styling
- **Framer Motion** - Smooth animations
- **Recharts** - Data visualization
- **React Hook Form** - Form handling with Zod validation

### Backend & Database
- **Supabase** - PostgreSQL database with Row Level Security (RLS)
- **MongoDB** - Document storage for specific features
- **Redis (ioredis)** - Caching and session management
- **Nodemailer** - Email notifications

### Additional Tools
- **Google Generative AI** - AI-powered features
- **PapaParse** - CSV parsing for bulk imports
- **date-fns** - Date manipulation
- **Lucide React** - Icon library

## 📁 Project Structure

```
zamschool-os/
├── app/                    # Next.js App Router pages
├── components/             # Reusable React components
├── lib/                    # Utility functions and business logic
├── webapp/                 # Core application middleware and configurations
├── scripts/                # Build and deployment scripts
├── migrations/             # Database schema migrations
├── public/                 # Static assets
├── tests/                  # Test files (52+ test modules)
└── docs/                   # Documentation
```

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ 
- npm or yarn
- Supabase account and project
- MongoDB instance (optional, for specific features)
- Redis instance (optional, for caching)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd zamschool-os
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file with:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   MONGODB_URI=your_mongodb_uri
   REDIS_URL=your_redis_url
   NODEMAILER_HOST=your_smtp_host
   NODEMAILER_PORT=your_smtp_port
   NODEMAILER_USER=your_smtp_user
   NODEMAILER_PASS=your_smtp_pass
   GOOGLE_GENAI_API_KEY=your_google_ai_key
   ```

4. **Run database migrations**
   ```bash
   # Apply Supabase migrations through Supabase CLI or dashboard
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Build for production**
   ```bash
   npm run build
   npm start
   ```

## 🧪 Testing

The project includes 52+ test modules covering middleware, security, authentication, routes, and UI components.

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run library tests only
npm run test:lib

# Run root level tests only
npm run test:root

# Run specific test file
node --test lib/otp-security.test.mjs
```

### Test Coverage Areas
- Middleware and routing
- Authentication and rate limiting
- OTP security mechanisms
- Attendance management
- Assignment workflows
- Result notifications
- Admin and teacher route clients
- Schema validations
- Offline support
- Security remediations

### Writing Tests

Tests use Node.js native test runner. Example:

```typescript
import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('MyService', () => {
  it('should do something', () => {
    assert.equal(true, true);
  });
});
```

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run clean` | Clean build artifacts |
| `npm run healthcheck` | Run health checks |
| `npm run schema:check` | Validate database schema |
| `npm run schema:check:strict` | Strict schema validation |
| `npm test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:lib` | Run library tests only |
| `npm run test:root` | Run root-level tests only |

## 🔒 Security Features

- OTP-based authentication with rate limiting
- Row Level Security (RLS) on all database tables
- Role-based access control (RBAC)
- Input validation with Zod schemas
- CORS protection for API routes
- Security headers and CSP
- Automated security remediation tests

## 📊 Database Schema

The system uses 14+ database migrations covering:
- User profiles and role assignments
- Classes, streams, and subjects
- Attendance records and summaries
- Assignments and submissions
- Results and grading scales
- Messages and notifications
- Events and calendars
- Payments and invoices
- Settings and configurations

## 🤝 Contributing

Contributions are welcome! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

Quick start:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes and write tests
4. Run tests: `npm test`
5. Commit using conventional commits
6. Push and open a Pull Request

## 📄 License

This project is proprietary software. All rights reserved.

## 🆘 Support

For support and questions:
- Check existing documentation in the `/docs` folder
  - [API Documentation](docs/API.md)
  - [Deployment Guide](docs/DEPLOYMENT.md)
- Review test files for usage examples
- Read the [Contributing Guide](CONTRIBUTING.md)
- Contact the development team

## 📈 Project Stats

- **258+** TypeScript files
- **52+** Test modules
- **14** Database migrations
- **5** User roles supported
- **10+** Core feature modules

---

Built with ❤️ for educational institutions