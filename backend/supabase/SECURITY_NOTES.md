# Security Notes for Password Handling

## ⚠️ IMPORTANT: Password Security

**NEVER store plain text passwords in production!**

### Current Test Setup
The test file (`src/lib/testSupabase.ts`) currently uses a plain text password for testing purposes only.

### Production Requirements

1. **Hash Passwords Before Storage**
   ```typescript
   import bcrypt from 'bcryptjs';
   
   const hashedPassword = await bcrypt.hash(password, 10);
   ```

2. **Use Supabase Auth (Recommended)**
   Instead of storing passwords directly, use Supabase Authentication:
   ```typescript
   const { data, error } = await supabase.auth.signUp({
     email: 'user@example.com',
     password: 'secure_password',
   });
   ```

3. **Password Requirements**
   - Minimum 8 characters
   - Include uppercase, lowercase, numbers, and special characters
   - Example: `Amaresh@1234` ✅

### Recommended Approach

**Use Supabase Auth instead of custom password storage:**

```typescript
// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'Amaresh@1234',
});

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'Amaresh@1234',
});
```

### Migration Path

1. Enable Supabase Authentication in Dashboard
2. Use `supabase.auth` methods instead of direct table inserts
3. Remove password field from users table (or keep for migration only)
4. Use `auth.users` table managed by Supabase

### Current Test Password
- Password: `Amaresh@1234`
- **For testing only** - Do not use in production without hashing!

