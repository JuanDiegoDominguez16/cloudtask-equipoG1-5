const SUPABASE_URL = "https://jhlugcipllkiyzstydvm.supabase.co";
const SUPABASE_ANON_KEY =
	"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpobHVnY2lwbGxraXl6c3R5ZHZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1NTAxMTYsImV4cCI6MjEwNDEyNjExNn0.hTZ5qngAco65wMsdxiu032dhJBajv_dprtXfWPPEleM";

window.supabaseClient = window.supabase.createClient(
	SUPABASE_URL,
	SUPABASE_ANON_KEY,
);
