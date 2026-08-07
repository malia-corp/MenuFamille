import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const rating = request.nextUrl.searchParams.get('rating') as
    | 'excellent' | 'correct' | 'decevant'
    | null

  let query = supabase
    .from('feedback_templates')
    .select('id, category, message, sort_order')
    .eq('is_active', true)
    .order('sort_order')

  if (rating) {
    query = query.eq('category', rating)
  }

  const { data, error } = await query

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data ?? [])
}
