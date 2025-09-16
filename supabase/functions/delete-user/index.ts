import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Create regular client to verify the user making the request
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    )

    // Verify the requesting user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    
    if (userError || !user) {
      throw new Error('Invalid user session')
    }

    console.log(`🗑️ Starting deletion process for user: ${user.id}`)

    // Step 1: Delete user interactions (foreign key dependencies first)
    const { error: interactionsError } = await supabaseAdmin
      .from('user_interactions')
      .delete()
      .eq('user_id', user.id)

    if (interactionsError) {
      console.warn('⚠️ Failed to delete user interactions:', interactionsError)
    } else {
      console.log('✅ User interactions deleted')
    }

    // Step 2: Remove user from parallel rooms
    try {
      const { data: rooms } = await supabaseAdmin
        .from('parallel_rooms')
        .select('id, current_participants')
        .contains('current_participants', [user.id])

      if (rooms && rooms.length > 0) {
        for (const room of rooms) {
          const updatedParticipants = room.current_participants.filter(
            (id: string) => id !== user.id
          )
          
          await supabaseAdmin
            .from('parallel_rooms')
            .update({ current_participants: updatedParticipants })
            .eq('id', room.id)
        }
        console.log('✅ Removed user from parallel rooms')
      }
    } catch (roomError) {
      console.warn('⚠️ Failed to remove from rooms:', roomError)
    }

    // Step 3: Delete any other related data (add more tables as needed)
    // Example: Delete user's created quests, comments, etc.
    const relatedTables = [
      // Add other tables that reference the user
      // 'user_quests',
      // 'user_comments', 
      // 'user_achievements',
    ]

    for (const table of relatedTables) {
      try {
        const { error } = await supabaseAdmin
          .from(table)
          .delete()
          .eq('user_id', user.id)
        
        if (error) {
          console.warn(`⚠️ Failed to delete from ${table}:`, error)
        } else {
          console.log(`✅ Deleted data from ${table}`)
        }
      } catch (error) {
        console.warn(`⚠️ Error deleting from ${table}:`, error)
      }
    }

    // Step 4: Delete user profile
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', user.id)

    if (profileError) {
      throw new Error(`Failed to delete user profile: ${profileError.message}`)
    }
    console.log('✅ User profile deleted')

    // Step 5: Delete auth user (requires admin privileges)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
    
    if (authError) {
      throw new Error(`Failed to delete auth user: ${authError.message}`)
    }
    console.log('✅ Auth user deleted')

    // Step 6: Log the deletion for audit purposes
    await supabaseAdmin
      .from('deletion_logs')
      .insert({
        deleted_user_id: user.id,
        deleted_at: new Date().toISOString(),
        deleted_by: user.id, // Self-deletion
        deletion_reason: 'user_requested'
      })
      .catch(logError => {
        console.warn('⚠️ Failed to log deletion:', logError)
      })

    console.log(`✅ User ${user.id} completely deleted`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User account permanently deleted',
        deleted_user_id: user.id
      }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 200,
      }
    )

  } catch (error) {
    console.error('❌ Delete user error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to delete user account' 
      }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 400,
      }
    )
  }
})