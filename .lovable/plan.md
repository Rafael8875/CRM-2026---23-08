# Security Resolution Plan

The goal is to fix critical security vulnerabilities related to unauthorized access, weak endpoint protection, and potential data leakage between users.

## Improvements

### 1. Authenticated Server Functions
- Add `requireSupabaseAuth` middleware to all exported functions in `src/lib/users.functions.ts`.
- Ensure all functions in `src/lib/` that access user-specific data are correctly checking `context.userId`.

### 2. Cron Endpoint Security
- Secure `/api/public/cron/event-alerts` by enforcing a strong `CRON_SECRET` check even in development/preview environments.
- Use a dedicated service role client for cross-user operations only after verifying the request is authentic.

### 3. Auth Flow Cleanup
- Refine the "8875" login bridge to ensure it doesn't bypass real Supabase security and that it properly seeds a profile if missing.
- Ensure `user_id` is always enforced in RLS policies for all tables.

### 4. RLS Verification
- Double check that `GRANT` statements and RLS policies are applied to all new tables (`event_reminders`, `user_roles`).

## Technical Details

- **File Modifications**:
    - `src/lib/users.functions.ts`: Wrap `listUsers` and `createUser` with `.middleware([requireSupabaseAuth])`.
    - `src/routes/api/public/cron/event-alerts.ts`: Enforce strict `Authorization` header check.
    - `src/integrations/supabase/auth-middleware.ts`: Verify it handles both cookies and headers correctly for SSR/CSR.
    - `supabase/migrations/*`: Verify all tables have `ENABLE ROW LEVEL SECURITY` and policies using `auth.uid()`.

- **User Roles**: Ensure that only 'admin' roles can access `listUsers` and `createUser`.
