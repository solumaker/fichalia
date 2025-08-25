interface EnvironmentConfig {
  supabaseUrl: string
  supabaseAnonKey: string
  isDevelopment: boolean
  isProduction: boolean
}

function validateEnvironmentVariables(): EnvironmentConfig {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    throw new Error('VITE_SUPABASE_URL is required. Please check your .env file and ensure it contains your Supabase project URL.')
  }

  if (!supabaseAnonKey) {
    throw new Error('VITE_SUPABASE_ANON_KEY is required. Please check your .env file and ensure it contains your Supabase anonymous key.')
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD
  }
}

export const env = validateEnvironmentVariables()