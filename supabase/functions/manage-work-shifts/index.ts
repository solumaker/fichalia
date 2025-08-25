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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the user is authenticated and is an admin
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || profile?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { userId, shifts } = await req.json()

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!Array.isArray(shifts)) {
      return new Response(
        JSON.stringify({ error: 'shifts must be an array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the target user exists
    const { data: targetUser, error: targetUserError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (targetUserError || !targetUser) {
      return new Response(
        JSON.stringify({ error: 'Target user not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // STEP 1: Always delete ALL existing shifts for the user (using service role bypasses RLS)
    const { error: deleteError } = await supabaseAdmin
      .from('work_shifts')
      .delete()
      .eq('user_id', userId)

    if (deleteError) {
      return new Response(
        JSON.stringify({ error: `Failed to delete existing shifts: ${deleteError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // STEP 2: If no shifts to insert, we're done (user deleted all shifts)
    if (shifts.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'All shifts deleted successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // STEP 3: Basic validation only (no overlap checking since we're recreating everything)
    for (let i = 0; i < shifts.length; i++) {
      const shift = shifts[i] as WorkShiftInput
      
      if (typeof shift.day_of_week !== 'number' || shift.day_of_week < 0 || shift.day_of_week > 6) {
        return new Response(
          JSON.stringify({ error: `Invalid day_of_week for shift ${i + 1}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      if (!shift.start_time || !shift.end_time) {
        return new Response(
          JSON.stringify({ error: `Missing start_time or end_time for shift ${i + 1}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/
      
      if (!timeRegex.test(shift.start_time) || !timeRegex.test(shift.end_time)) {
        return new Response(
          JSON.stringify({ error: `Invalid time format for shift ${i + 1}. Expected HH:MM or HH:MM:SS format` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      let startTime = shift.start_time
      let endTime = shift.end_time
      
      if (startTime === endTime) {
        return new Response(
          JSON.stringify({ error: `Start time and end time cannot be the same for shift ${i + 1}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      // Convert HH:MM:SS to HH:MM format for database storage
      startTime = startTime.length > 5 ? startTime.substring(0, 5) : startTime
      endTime = endTime.length > 5 ? endTime.substring(0, 5) : endTime
      
      // Validate the cleaned time format (should be HH:MM now)
      const cleanTimeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
      
      if (!cleanTimeRegex.test(startTime) || !cleanTimeRegex.test(endTime)) {
        return new Response(
          JSON.stringify({ 
            error: `Invalid time format for shift ${i + 1}. Expected HH:MM format. Received: start="${shift.start_time}" -> cleaned: "${startTime}", end="${shift.end_time}" -> cleaned: "${endTime}"` 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      // Update the shift with cleaned values
      shifts[i].start_time = startTime
      shifts[i].end_time = endTime
    }

    // STEP 4: Insert ALL new shifts (using service role bypasses RLS)
    const shiftsToInsert = shifts.map((shift: WorkShiftInput) => ({
      user_id: userId,
      day_of_week: shift.day_of_week,
      start_time: shift.start_time,
      end_time: shift.end_time,
      is_active: shift.is_active,
      break_duration_minutes: shift.break_duration_minutes || 0
    }))

    const { error: insertError } = await supabaseAdmin
      .from('work_shifts')
      .insert(shiftsToInsert)

    if (insertError) {
      return new Response(
        JSON.stringify({ error: `Failed to insert new shifts: ${insertError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const successMessage = `Successfully saved ${shifts.length} shift${shifts.length !== 1 ? 's' : ''}`
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: successMessage
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: `Server error: ${error.message}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})