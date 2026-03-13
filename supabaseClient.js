// Supabase client setup (UMD mode via CDN script in HTML)
// Make sure index/login/register use
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js"></script>

const SUPABASE_URL = "https://glchykedrrzgxbnetteq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsY2h5a2VkcnJ6Z3hibmV0dGVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MDAyNjEsImV4cCI6MjA4ODk3NjI2MX0.qQJu7NIJhWePrLFoGkqJePHe24NRqDsQqArRT4lSWxA";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabaseClient = supabaseClient;

async function getSession() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    console.error('Supabase getSession error', error);
    return null;
  }
  return data.session;
}

async function isLoggedIn() {
  const session = await getSession();
  return !!session;
}

async function getCurrentUser() {
  const { data, error } = await supabaseClient.auth.getUser();
  if (error) {
    console.error('Supabase getUser error', error);
    return null;
  }
  return data.user;
}

async function logoutSupabase() {
  const { error } = await supabaseClient.auth.signOut();
  if (error) console.error('Supabase signOut error', error);
}
