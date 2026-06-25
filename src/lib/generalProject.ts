import { supabase } from '@/lib/supabase'

const GENERAL_NAME = 'General'

// The shared fallback project for agendas saved without one. Found by name (created once on
// first use); an agenda parked here can be reassigned later from its detail page.
export async function ensureGeneralProjectId(createdBy: string): Promise<string | null> {
  const { data } = await supabase
    .from('projects')
    .select('id')
    .eq('name', GENERAL_NAME)
    .order('created_at', { ascending: true })
    .limit(1)
  if (data && data.length > 0) return data[0].id

  const { data: created } = await supabase
    .from('projects')
    .insert({ name: GENERAL_NAME, created_by: createdBy, archived: false })
    .select('id')
    .single()
  return created?.id ?? null
}
