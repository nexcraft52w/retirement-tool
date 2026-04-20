import { createClient } from "@supabase/supabase-js";

// 🔍 デバッグログ（ここに入れる）
console.log("URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log("SERVICE KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});