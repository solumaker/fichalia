import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WorkShiftInput {
  day_of_week: number
  start_time: string
  end_time: string
  is_active: boolean
  break_duration_minutes?: number
}

serve(async (req) => {
  console.log('🚀 Edge Function started')
  console.log('📨 Request method:', req.method)
  console.log('🌐 Request URL:', req.url)
  
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling OPTIONS request')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔧 Creating Supabase admin client...')
    // Create a Supabase client with the service role key (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    console.log('✅ Supabase admin client created')

    // Get the authorization header from the request
    console.log('🔑 Checking authorization header...')
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('❌ No authorization header')
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log('✅ Authorization header found')

    // Verify the user is authenticated and is an admin
    console.log('👤 Verifying user authentication...')
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      console.error('❌ Invalid token or user error:', userError)
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log('✅ User authenticated:', user.email)

    // Check if user is admin
    console.log('🔍 Checking if user is admin...')
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || profile?.role !== 'admin') {
      console.error('❌ User is not admin or profile error:', profileError, profile)
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log('✅ User is admin')

    console.log('📦 Parsing request body...')
    const { userId, shifts } = await req.json()
    console.log('📋 Received data:', { userId, shiftsCount: shifts?.length })

    if (!userId) {
      console.error('❌ Missing userId')
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!Array.isArray(shifts)) {
      console.error('❌ Shifts is not an array:', typeof shifts)
      return new Response(
        JSON.stringify({ error: 'shifts must be an array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the target user exists
    console.log('👤 Verifying target user exists...')
    const { data: targetUser, error: targetUserError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (targetUserError || !targetUser) {
      console.error('❌ Target user not found:', targetUserError)
      return new Response(
        JSON.stringify({ error: 'Target user not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log('✅ Target user exists')

    // Delete existing shifts for the user (using service role bypasses RLS)
    console.log('🗑️ Deleting existing shifts...')
    const { error: deleteError } = await supabaseAdmin
      .from('work_shifts')
      .delete()
      .eq('user_id', userId)

    if (deleteError) {
      console.error('❌ Failed to delete existing shifts:', deleteError)
      return new Response(
        JSON.stringify({ error: `Failed to delete existing shifts: ${deleteError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log('✅ Existing shifts deleted')

    // If no shifts to insert, we're done (user deleted all shifts)
    if (shifts.length === 0) {
      console.log('✅ No shifts to insert, operation completed')
      return new Response(
        JSON.stringify({ success: true, message: 'All shifts deleted successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate shifts before inserting
    console.log('🔍 Validating shifts before inserting...')
    for (let i = 0; i < shifts.length; i++) {
      const shift = shifts[i] as WorkShiftInput
      
      if (typeof shift.day_of_week !== 'number' || shift.day_of_week < 0 || shift.day_of_week > 6) {
        console.error('❌ Invalid day_of_week for shift', i + 1, ':', shift.day_of_week)
        return new Response(
          JSON.stringify({ error: `Invalid day_of_week for shift ${i + 1}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      if (!shift.start_time || !shift.end_time) {
        console.error('❌ Missing times for shift', i + 1, ':', { start_time: shift.start_time, end_time: shift.end_time })
        return new Response(
          JSON.stringify({ error: `Missing start_time or end_time for shift ${i + 1}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      if (shift.start_time === shift.end_time) {
        console.error('❌ Same start and end time for shift', i + 1)
        return new Response(
          JSON.stringify({ error: `Start time and end time cannot be the same for shift ${i + 1}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }
    console.log('✅ All shifts validated')

    // Insert new shifts (using service role bypasses RLS)
    console.log('💾 Inserting new shifts...')
    const shiftsToInsert = shifts.map((shift: WorkShiftInput) => ({
      user_id: userId,
      day_of_week: shift.day_of_week,
      start_time: shift.start_time,
      end_time: shift.end_time,
      is_active: shift.is_active,
      break_duration_minutes: shift.break_duration_minutes || 0
    }))
    console.log('📋 Shifts to insert:', shiftsToInsert)

    const { error: insertError } = await supabaseAdmin
      .from('work_shifts')
      .insert(shiftsToInsert)

    if (insertError) {
      console.error('❌ Failed to insert new shifts:', insertError)
      return new Response(
        JSON.stringify({ error: `Failed to insert new shifts: ${insertError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log('✅ New shifts inserted successfully')

    const successMessage = `Successfully saved ${shifts.length} shift${shifts.length !== 1 ? 's' : ''}`
    console.log('🎉 Operation completed:', successMessage)
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: successMessage
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Edge Function error:', error)
    return new Response(
      JSON.stringify({ error: `Server error: ${error.message}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})