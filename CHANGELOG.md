# Changelog

All notable changes to ZamSchool OS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Test scripts to package.json (`test`, `test:watch`, `test:coverage`, `test:lib`, `test:root`)
- CONTRIBUTING.md with comprehensive contribution guidelines
- CHANGELOG.md for tracking project changes
- Husky prepare script for future git hooks setup

### Changed
- Updated README.md with improved documentation structure
- Enhanced project organization recommendations

### Fixed
- Removed node_modules to free up disk space
- Improved test runner configuration

## [0.1.0] - 2024-01-01

### Initial Release

#### Core Features
- Multi-role authentication system (Admin, Teacher, Student, Parent, Payments/Bursar)
- OTP-based secure login
- Role-specific dashboards with real-time statistics
- Class and subject management
- Attendance tracking with parent notifications
- Assignment creation, submission, and grading workflow
- Results and grading system with analytics
- Internal messaging system
- Events calendar
- Finance and payment management
- Bulk CSV import functionality

#### Technical Stack
- Next.js 15 with App Router
- TypeScript for type safety
- TailwindCSS 4 for styling
- Supabase PostgreSQL with Row Level Security
- MongoDB for document storage
- Redis for caching
- Nodemailer for email notifications
- Google Generative AI integration

#### Security
- Row Level Security (RLS) on all database tables
- Role-based access control (RBAC)
- Rate limiting on authentication endpoints
- Input validation with Zod schemas
- CORS protection
- Security headers and CSP

#### Testing
- 52+ test modules covering:
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

#### Database
- 14 database migrations
- Comprehensive schema for:
  - User profiles and roles
  - Classes, streams, and subjects
  - Attendance records
  - Assignments and submissions
  - Results and grading
  - Messages and notifications
  - Events
  - Payments and invoices

---

## Version History

- **0.1.0** - Initial release with core school management features
