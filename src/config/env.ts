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
    const errorMsg = '❌ VITE_SUPABASE_URL is missing! Please create a .env file with your Supabase URL. Example: VITE_SUPABASE_URL=https://your-project.supabase.co'
    console.error(errorMsg)
    alert(errorMsg)
    throw new Error(errorMsg)
  }

  if (!supabaseAnonKey) {
    const errorMsg = '❌ VITE_SUPABASE_ANON_KEY is missing! Please add your Supabase anonymous key to the .env file. Find it in your Supabase dashboard under Project Settings -> API.'
    console.error(errorMsg)
    alert(errorMsg)
    throw new Error(errorMsg)
  }

  // Validate URL format
  if (!supabaseUrl.includes('supabase.co')) {
    const errorMsg = '❌ Invalid Supabase URL format. It should look like: https://your-project.supabase.co'
    console.error(errorMsg)
    alert(errorMsg)
    throw new Error(errorMsg)
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD
  }
}

export const env = validateEnvironmentVariables()