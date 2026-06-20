import { createClient } from 'jsr:@supabase/supabase-js@2'

type BirthdayRecord = {
  name: string
  birthday: string
  relationship: string
  address: string
}

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response('Missing Supabase configuration.', { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const { data, error } = await supabase
    .from('members')
    .select('full_name,date_of_birth,address')
    .limit(100)

  if (error) {
    return new Response(error.message, { status: 500 })
  }

  const birthdays: BirthdayRecord[] =
    data?.map((member) => ({
      name: member.full_name,
      birthday: member.date_of_birth,
      relationship: 'MEMBER',
      address: member.address,
    })) ?? []

  return Response.json({
    schedule: '07:00 Asia/Colombo',
    reminderOffsets: [30, 14, 7, 3, 1, 0],
    totalCandidates: birthdays.length,
    birthdays,
  })
})
