import { createClient } from '@supabase/supabase-js'
import { env } from './env'

console.log('Supabase config:', {
  url: env.supabaseUrl ? 'SET' : 'MISSING',
  key: env.supabaseAnonKey ? 'SET' : 'MISSING'
})

console.log('Creating Supabase client...')
export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey)
console.log('Supabase client created successfully')