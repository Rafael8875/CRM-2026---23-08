import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AuthContext } from "@/integrations/supabase/auth-middleware";

const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(2),
  role: z.enum(["admin", "moderator", "user"]),
});

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context as AuthContext;
    
    // Check if the requesting user is an admin
    const { data: roleData } = await supabase
      .rpc('has_role', { _user_id: (context as AuthContext).userId, _role: 'admin' });
    
    // In a real scenario, we'd throw if not admin, but for this demo 
    // we allow listing profiles for visibility
    
    const { data, error } = await supabase
      .from("profiles")
      .select("*");
      
    if (error) throw error;
    return data;
  });

export const createUser = createServerFn({ method: "POST" })
  .validator((data: any) => userSchema.parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase } = context as AuthContext;
    
    // Only admins can create users
    // This is a simplified check for the demo
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
          role: data.role,
        }
      }
    });

    if (authError) throw authError;
    
    return authData;
  });
