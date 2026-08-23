import { createMiddleware } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { createClient, SupabaseClient, User } from '@supabase/supabase-js'
import type { Database } from './types'

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith('sb_publishable_') || value.startsWith('sb_secret_');
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(
      typeof Request !== 'undefined' && input instanceof Request ? (input as Request).headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    if (isNewSupabaseApiKey(supabaseKey) && headers.get('Authorization') === `Bearer ${supabaseKey}`) {
      headers.delete('Authorization');
    }

    headers.set('apikey', supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

export type AuthContext = {
  supabase: SupabaseClient<Database>;
  userId: string;
  user: User;
};

export const requireSupabaseAuth = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const SUPABASE_URL = process.env['SUPABASE_URL'] || '';
    const SUPABASE_PUBLISHABLE_KEY = process.env['SUPABASE_PUBLISHABLE_KEY'] || '';

    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      throw new Error(`Missing Supabase environment variable(s).`);
    }
    
    const request = getRequest();
    const authHeader = request?.headers.get('authorization');

    let token: string | null = authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null;
    
    if (!token) {
      const cookieHeader = request?.headers.get('cookie');
      if (cookieHeader) {
        const match = cookieHeader.match(/sb-[a-z0-9]+-auth-token=([^;]+)/);
        if (match && match[1]) {
          try {
            const session = JSON.parse(decodeURIComponent(match[1]));
            token = (session as any).access_token || null;
          } catch (e) {}
        }
      }
    }

    if (!token) {
      throw new Error('Unauthorized: No authorization header provided');
    }
    
    
    
    const supabase = createClient<Database>(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY,
      {
        global: {
          fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY),
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        auth: {
          storage: undefined,
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      throw new Error('Unauthorized: Invalid token');
    }

    return next({
      context: {
        supabase,
        userId: user.id,
        user,
      } as AuthContext,
    });
  },
);
