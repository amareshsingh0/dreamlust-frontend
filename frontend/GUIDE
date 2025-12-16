# Supabase Usage in Frontend

## ✅ Setup Complete

Your frontend is already set up with Supabase! Here's how to use it.

## 📍 Installation Location

**✅ Correct:** Installed in `frontend/` directory
```powershell
cd frontend
bun add @supabase/supabase-js  # Already done ✅
```

## 📝 Client File

**Location:** `frontend/src/lib/supabaseClient.ts`

```typescript
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

## 🧪 Quick Test

```typescript
import { supabase } from '@/lib/supabaseClient';

// Test query
const { data, error } = await supabase
  .from("content")
  .select("*")
  .limit(5);

console.log(data, error);
```

## 📚 Usage Examples

### Query Data
```typescript
import { supabase } from '@/lib/supabaseClient';

// Get all content
const { data, error } = await supabase
  .from('content')
  .select('*')
  .eq('is_public', true)
  .order('created_at', { ascending: false });
```

### Insert Data
```typescript
const { data, error } = await supabase
  .from('users')
  .insert({
    email: 'user@example.com',
    username: 'username',
    display_name: 'User Name'
  });
```

### Update Data
```typescript
const { data, error } = await supabase
  .from('users')
  .update({ display_name: 'New Name' })
  .eq('id', userId);
```

### Delete Data
```typescript
const { error } = await supabase
  .from('users')
  .delete()
  .eq('id', userId);
```

## 🔄 After Changes

**Always restart dev server after:**
- Installing new packages
- Updating `.env` file
- Changing Supabase configuration

```powershell
cd frontend
bun run dev
```

## ✅ Your Setup is Correct!

- ✅ Supabase client installed in frontend
- ✅ Client file created and configured
- ✅ Environment variables set up
- ✅ Ready to use!

