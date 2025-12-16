# GitHub Actions Workflows

This directory contains CI/CD workflows for the Dreamlust platform.

## 📋 Workflows Overview

### 1. CI Pipeline (`ci.yml`)
Runs on every pull request and push to main branches.

**Jobs:**
- **Lint**: Lints frontend code and checks TypeScript
- **Test Backend**: Runs backend unit tests with PostgreSQL and Redis services
- **Test Frontend**: Runs frontend unit tests and generates coverage
- **Build**: Verifies that both backend and frontend build successfully
- **E2E Tests**: Runs Playwright end-to-end tests (on main branch or manual trigger)

**Triggers:**
- Pull requests to `main`, `master`, `develop`
- Pushes to `main`, `master`, `develop`

### 2. CD Pipeline (`cd.yml`)
Deploys to staging/production environments.

**Jobs:**
- **Determine Environment**: Sets deployment target (staging/production)
- **Deploy Backend**: Deploys backend to Railway/Render
- **Deploy Frontend**: Deploys frontend to Vercel/Netlify/Cloudflare Pages
- **Smoke Tests**: Runs post-deployment health checks
- **Notify**: Sends deployment notifications (Slack)

**Triggers:**
- Pushes to `main`/`master` (production)
- Manual workflow dispatch (staging/production)

### 3. Security Scanning (`security.yml`)
Scans for security vulnerabilities and secrets.

**Jobs:**
- **Dependency Scan**: Runs `npm audit` on dependencies
- **CodeQL Analysis**: GitHub's code security analysis
- **Secret Scan**: Scans for exposed secrets using Gitleaks
- **SAST**: Static Application Security Testing with Semgrep

**Triggers:**
- Pull requests
- Weekly schedule (Mondays at 00:00 UTC)
- Manual trigger

### 4. Lighthouse CI (`lighthouse.yml`)
Performance and accessibility audits.

**Jobs:**
- **Lighthouse**: Runs Lighthouse CI on built frontend
- Uploads results as artifacts

**Triggers:**
- Pull requests
- Pushes to main branches
- Manual trigger

### 5. Load Testing (`load-test.yml`)
Performance and load testing with k6.

**Jobs:**
- **Load Test**: Runs k6 load tests on specified endpoints

**Triggers:**
- Weekly schedule (Sundays at 02:00 UTC)
- Manual trigger

### 6. Code Quality (`code-quality.yml`)
Code quality checks and analysis.

**Jobs:**
- **Typecheck**: TypeScript type checking
- **Coverage**: Code coverage analysis
- **Bundle Size**: Analyzes frontend bundle sizes

**Triggers:**
- Pull requests
- Pushes to main branches

### 7. PR Checks (`pr-checks.yml`)
Pull request validation and automation.

**Jobs:**
- **PR Validation**: Validates PR title format (conventional commits)
- **Breaking Changes**: Checks for breaking changes
- **Auto Assign**: Automatically assigns reviewers based on file paths

**Triggers:**
- Pull request events (opened, synchronized, reopened, ready_for_review)

## 🔧 Required Secrets

Configure these secrets in GitHub repository settings:

### Backend Deployment
- `DATABASE_URL` - Production database connection string
- `RAILWAY_TOKEN` - Railway deployment token (optional)
- `RENDER_SERVICE_ID` - Render service ID (optional)
- `RENDER_API_KEY` - Render API key (optional)

### Frontend Deployment
- `VITE_API_URL` - Backend API URL
- `VITE_CDN_URL` - CDN URL
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anon key
- `VITE_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `VITE_SENTRY_DSN` - Sentry frontend DSN
- `VERCEL_TOKEN` - Vercel deployment token (optional)
- `VERCEL_ORG_ID` - Vercel organization ID (optional)
- `VERCEL_PROJECT_ID` - Vercel project ID (optional)
- `NETLIFY_AUTH_TOKEN` - Netlify auth token (optional)
- `NETLIFY_SITE_ID` - Netlify site ID (optional)
- `CLOUDFLARE_API_TOKEN` - Cloudflare API token (optional)
- `CLOUDFLARE_ACCOUNT_ID` - Cloudflare account ID (optional)

### Monitoring & Notifications
- `SLACK_WEBHOOK_URL` - Slack webhook for notifications (optional)
- `LHCI_GITHUB_APP_TOKEN` - Lighthouse CI GitHub app token (optional)
- `API_URL` - Production API URL for smoke tests
- `FRONTEND_URL` - Production frontend URL for smoke tests

## 🚀 Usage

### Running Workflows Manually

1. Go to **Actions** tab in GitHub
2. Select the workflow you want to run
3. Click **Run workflow**
4. Select branch and options
5. Click **Run workflow**

### Viewing Results

- **CI Results**: Check the **Checks** tab on pull requests
- **Deployment Status**: Check the **Actions** tab for deployment logs
- **Security Alerts**: Check the **Security** tab for vulnerabilities
- **Coverage Reports**: Check Codecov or coverage artifacts

## 📊 Workflow Status Badges

Add these badges to your README:

```markdown
![CI](https://github.com/your-org/dreamlust-project/workflows/CI%20Pipeline/badge.svg)
![CD](https://github.com/your-org/dreamlust-project/workflows/CD%20Pipeline/badge.svg)
![Security](https://github.com/your-org/dreamlust-project/workflows/Security%20Scanning/badge.svg)
```

## 🔍 Troubleshooting

### Workflow Failures

1. **Check logs**: Click on the failed job to see detailed logs
2. **Check secrets**: Ensure all required secrets are configured
3. **Check permissions**: Verify GitHub Actions permissions
4. **Check dependencies**: Ensure package.json files are up to date

### Common Issues

- **Database connection errors**: Check `DATABASE_URL` secret
- **Build failures**: Check environment variables and dependencies
- **Deployment failures**: Verify deployment service tokens
- **Test failures**: Check test environment setup

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Bun Setup Action](https://github.com/oven-sh/setup-bun)
- [Vercel Action](https://github.com/amondnet/vercel-action)
- [Railway Deploy Action](https://github.com/bervProject/railway-deploy)


