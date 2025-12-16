# 🚨 Security Incident Response - Exposed Credentials

## ⚠️ CRITICAL: Credentials Exposed in GitHub

**Date:** December 16, 2025  
**File:** `backend/.env.temp`  
**Service:** Mux API credentials  
**Status:** ⚠️ **COMPROMISED - ROTATE IMMEDIATELY**

## Immediate Actions Required

### 1. ✅ Rotate Mux Credentials (URGENT)

**Mux API Credentials were exposed in commit history.**

**Steps to rotate:**

1. **Go to Mux Dashboard:**
   - Visit: https://dashboard.mux.com/settings/access-tokens
   - Log in to your Mux account

2. **Revoke the exposed token:**
   - Find the token that was in `.env.temp`
   - Click "Revoke" or "Delete"
   - This immediately invalidates the old token

3. **Create a new token:**
   - Click "Create new token"
   - Give it a descriptive name (e.g., "Dreamlust Production - Regenerated")
   - Copy the new token immediately (it won't be shown again)

4. **Update your environment variables:**
   - Update `backend/.env` with the new token
   - Update production environment variables (Render/Railway/etc.)
   - **DO NOT** commit the new token to git

### 2. ✅ Remove File from Git History

The file has been removed from the current working directory, but it still exists in git history.

**Option A: Using git filter-branch (Recommended for small repos)**

```powershell
# Remove .env.temp from entire git history
git filter-branch --force --index-filter `
  "git rm --cached --ignore-unmatch backend/.env.temp" `
  --prune-empty --tag-name-filter cat -- --all

# Force push to update remote (WARNING: This rewrites history)
git push origin --force --all
git push origin --force --tags
```

**Option B: Using BFG Repo-Cleaner (Recommended for large repos)**

1. Download BFG: https://rtyley.github.io/bfg-repo-cleaner/
2. Run:
```bash
java -jar bfg.jar --delete-files .env.temp
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

**Option C: Contact GitHub Support**

If you're unsure about rewriting history:
- GitHub Support can help remove sensitive data
- Visit: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository

### 3. ✅ Verify .gitignore is Updated

✅ **Already done:**
- Added `.env.temp` to root `.gitignore`
- Added `.env.temp` to `backend/.gitignore`
- Added patterns: `*.env.temp` and `.env.*.temp`

**Verify:**
```powershell
# Check if .env.temp is ignored
git check-ignore -v backend/.env.temp
```

### 4. ✅ Check for Other Exposed Files

**Run these checks:**

```powershell
# Check for any .env files in git history
git log --all --full-history --source --all -- "**/.env*"

# Check for any files with "temp" in name
git log --all --full-history --source --all -- "**/*temp*"

# Check for any files with "secret" or "key" in name
git log --all --full-history --source --all -- "**/*secret*"
git log --all --full-history --source --all -- "**/*key*"
```

### 5. ✅ Update All Environment Variables

**Check these services for exposed credentials:**

- ✅ **Mux** - Rotate immediately (see step 1)
- ⚠️ **Supabase** - Check if any keys were exposed
- ⚠️ **Database** - Check if DATABASE_URL was exposed
- ⚠️ **JWT_SECRET** - Check if exposed, rotate if needed
- ⚠️ **AWS/S3** - Check if access keys were exposed
- ⚠️ **Stripe** - Check if API keys were exposed
- ⚠️ **Sentry** - Check if DSN was exposed
- ⚠️ **Any other API keys** - Review all services

### 6. ✅ Audit Repository Access

**Check who has access:**
- Review repository collaborators
- Review GitHub organization members
- Check if repository was ever public
- Review commit history for suspicious activity

## Prevention Measures

### ✅ Immediate Fixes Applied

1. ✅ Updated `.gitignore` to exclude `.env.temp`
2. ✅ Added comprehensive patterns for temp env files
3. ✅ Documented this incident for future reference

### 📋 Best Practices Going Forward

1. **Never commit .env files:**
   - Use `.env.example` with placeholder values
   - Use `.env.local` for local development (already in .gitignore)
   - Use environment variables in production (Render/Railway/etc.)

2. **Use git-secrets or similar:**
   ```bash
   # Install git-secrets
   git secrets --install
   git secrets --register-aws
   ```

3. **Pre-commit hooks:**
   - Add a pre-commit hook to scan for secrets
   - Use tools like: https://github.com/Yelp/detect-secrets

4. **Regular audits:**
   - Run `git log --all --full-history --source --all -- "**/.env*"` regularly
   - Use GitHub's secret scanning (enabled by default)

5. **Use secret management:**
   - Consider using services like:
     - AWS Secrets Manager
     - HashiCorp Vault
     - GitHub Secrets (for CI/CD)

## Commits That Contained the File

The file was committed in these commits:
- `59805b83c79a215266cc1cb7b584681cb3031438` - "Comprehensive fixes: Backend connection..."
- `16493721c3fd90a2303ee95032109d88f07e3813` - "Update project files and configurations"

## Resources

- **GitHub Guide:** https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository
- **How to Rotate:** https://howtorotate.com/docs/introduction/getting-started/
- **Mux Dashboard:** https://dashboard.mux.com/settings/access-tokens

## Status Checklist

- [ ] Mux credentials rotated
- [ ] File removed from git history
- [ ] .gitignore updated (✅ Done)
- [ ] Other services checked for exposure
- [ ] Repository access audited
- [ ] Team notified (if applicable)
- [ ] Monitoring enabled for suspicious activity

---

**⚠️ Remember:** Even after removing from git history, if the repository was public, the credentials may have been scraped. Always rotate exposed credentials immediately.

