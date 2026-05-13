# DEPLOYMENT GUIDE

This guide covers deploying ZamSchool OS to various platforms.

## Prerequisites

Before deploying, ensure you have:

- A Supabase project with migrations applied
- MongoDB instance (optional, for specific features)
- Redis instance (optional, for caching)
- SMTP server credentials for email notifications
- Google Generative AI API key (optional)

## Environment Variables

Create a `.env` file with the following variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# MongoDB (optional)
MONGODB_URI=mongodb://localhost:27017/zamschool

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Email (Nodemailer)
NODEMAILER_HOST=smtp.gmail.com
NODEMAILER_PORT=587
NODEMAILER_USER=your-email@gmail.com
NODEMAILER_PASS=your-app-password

# Google AI (optional)
GOOGLE_GENAI_API_KEY=your-google-ai-key

# Application
NEXT_PUBLIC_APP_URL=https://your-domain.com
JWT_SECRET=your-jwt-secret-min-32-chars
```

## Deployment Options

### Vercel (Recommended)

Vercel provides the easiest deployment for Next.js applications.

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```

4. **Set Environment Variables**
   - Go to your project dashboard on Vercel
   - Navigate to Settings → Environment Variables
   - Add all required environment variables

5. **Production Deployment**
   ```bash
   vercel --prod
   ```

### Docker Deployment

1. **Build Docker Image**
   ```bash
   docker build -t zamschool-os .
   ```

2. **Run Container**
   ```bash
   docker run -d \
     -p 3000:3000 \
     --env-file .env \
     --name zamschool \
     zamschool-os
   ```

### Manual Deployment

1. **Build the Application**
   ```bash
   npm run build
   ```

2. **Start Production Server**
   ```bash
   npm start
   ```

3. **Use PM2 for Process Management** (Recommended)
   ```bash
   npm install -g pm2
   pm2 start npm --name "zamschool" -- start
   pm2 save
   pm2 startup
   ```

## Database Setup

### Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Apply migrations from the `migrations/` folder
3. Enable Row Level Security (RLS) on all tables
4. Configure authentication providers if needed

### MongoDB (Optional)

```bash
# Install MongoDB locally or use MongoDB Atlas
# Create database and collections as needed
```

### Redis (Optional)

```bash
# Install Redis
# Ubuntu/Debian
sudo apt-get install redis-server

# Start Redis
sudo systemctl start redis

# Or use Docker
docker run -d -p 6379:6379 redis:latest
```

## Post-Deployment Checklist

- [ ] Verify all environment variables are set
- [ ] Test user authentication (all roles)
- [ ] Verify database connections
- [ ] Test email notifications
- [ ] Check file uploads (if applicable)
- [ ] Verify SSL/HTTPS is working
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy
- [ ] Test disaster recovery procedures

## Monitoring & Logging

### Health Checks

The application includes a health check endpoint:

```bash
npm run healthcheck
```

### Logs

- **Vercel**: View logs in the Vercel dashboard
- **Docker**: `docker logs zamschool`
- **PM2**: `pm2 logs zamschool`

### Error Tracking

Consider integrating:
- Sentry for error tracking
- LogRocket for session replay
- Datadog for comprehensive monitoring

## Performance Optimization

### Production Build

The application uses Next.js standalone output for optimized production builds:

```bash
npm run build
# Output is in .next/standalone
```

### Caching

- Redis is used for session management and caching
- Enable CDN caching for static assets
- Configure browser caching headers

### Database Optimization

- Ensure proper indexes on frequently queried columns
- Use connection pooling
- Monitor query performance

## Security Considerations

- Keep all dependencies updated
- Use strong secrets for JWT and other sensitive values
- Enable HTTPS everywhere
- Configure CORS properly
- Regular security audits
- Monitor for suspicious activity

## Scaling

### Horizontal Scaling

- Deploy multiple instances behind a load balancer
- Use Redis for shared session storage
- Ensure database can handle increased load

### Vertical Scaling

- Increase server resources (CPU, RAM)
- Optimize database queries
- Use caching effectively

## Troubleshooting

### Common Issues

**Database Connection Errors**
- Verify connection strings
- Check firewall rules
- Ensure database is running

**Authentication Issues**
- Verify Supabase credentials
- Check RLS policies
- Review JWT configuration

**Email Not Sending**
- Verify SMTP credentials
- Check email provider limits
- Review spam folders

### Getting Help

- Check application logs
- Review error messages
- Consult documentation
- Open an issue on GitHub

## Updates & Maintenance

### Updating the Application

```bash
# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Run migrations (if any)
# Apply through Supabase dashboard

# Rebuild
npm run build

# Restart
pm2 restart zamschool
# or
docker-compose restart
```

### Backup Strategy

1. **Database Backups**
   - Supabase automatic backups (enable in dashboard)
   - Manual exports regularly

2. **File Backups**
   - Backup uploaded files
   - Version control for code

3. **Environment Variables**
   - Securely store all environment variables
   - Use secrets management tools

## Support

For deployment issues:
1. Check this guide thoroughly
2. Review application logs
3. Search existing issues
4. Open a new issue with details

---

Last updated: May 2024
