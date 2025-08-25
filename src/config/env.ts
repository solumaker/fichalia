interface EnvironmentConfig {
  supabaseUrl: string
  supabaseAnonKey: string
  isDevelopment: boolean
  isProduction: boolean
}

function validateEnvironmentVariables(): EnvironmentConfig {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  console.log('Environment check:', {
    supabaseUrl: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'MISSING',
    supabaseAnonKey: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'MISSING'
  })

  if (!supabaseUrl) {
    console.error('❌ VITE_SUPABASE_URL is missing!')
    throw new Error('VITE_SUPABASE_URL is required. Please check your .env file and ensure it contains your Supabase project URL. Example: VITE_SUPABASE_URL=https://your-project.supabase.co')
  }

  if (!supabaseAnonKey) {
    console.error('❌ VITE_SUPABASE_ANON_KEY is missing!')
    throw new Error('VITE_SUPABASE_ANON_KEY is required. Please check your .env file and ensure it contains your Supabase anonymous key. You can find this in your Supabase dashboard under Project Settings -> API.')
  }

  console.log('✅ Supabase environment variables loaded successfully')

  return {
    supabaseUrl,
    supabaseAnonKey,
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD
  }
}

export const env = validateEnvironmentVariables()