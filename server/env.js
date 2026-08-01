import 'dotenv/config';
import dotenv from 'dotenv';

// Load .env.local in addition to .env so the server picks up VITE_ prefixed
// Supabase credentials used during local development.
// This file must be imported before any module that reads environment variables.
dotenv.config({ path: '.env.local' });