
// Database interaction module
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Set Supabase credentials for Edge Function
const supabaseUrl = "https://ffxgtodowddzxlqraxlt.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmeGd0b2Rvd2RkenhscXJheGx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ1OTE4MTMsImV4cCI6MjA2MDE2NzgxM30.SsTedFa8hb1vlEGR0IYjCPAzNvLBduXnHXalWjRT0w8";

// Create Supabase client for the edge function
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
