import {
  PUBLIC_SUPABASE_ANON_KEY,
  PUBLIC_SUPABASE_URL,
} from "$env/static/public"
import { createSupabaseLoadClient } from "@supabase/auth-helpers-sveltekit"
import type { Database } from "../../../DatabaseDefinitions.ts"
import { redirect } from "@sveltejs/kit"

export const load = async ({ fetch, data, depends, url }) => {
  depends("supabase:auth")

  const supabase = createSupabaseLoadClient({
    supabaseUrl: PUBLIC_SUPABASE_URL,
    supabaseKey: PUBLIC_SUPABASE_ANON_KEY,
    event: { fetch },
    serverSession: data.session,
  })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  let profile = data.profile

  const createProfilePath = "/account/create_profile"
  if (!_hasFullProfile(profile) && url.pathname !== createProfilePath) {
    throw redirect(303, createProfilePath)
  }

  // Fetch journal_entries data
  const { data: journalEntries, error: journalEntriesError } = await supabase
    .from("journal_entries")
    .select("*")
    .eq("user_id", session?.user?.id) // Add null check for session

  if (journalEntriesError) {
    console.error("Error fetching journal entries:", journalEntriesError)
    throw new Error("Failed to fetch journal entries.")
  }

  return { supabase, session, profile, journalEntries }
}

export const _hasFullProfile = (
  profile: Database["public"]["Tables"]["profiles"]["Row"],
) => {
  if (!profile) {
    return false
  }
  if (!profile.full_name) {
    return false
  }
  if (!profile.company_name) {
    return false
  }
  if (!profile.website) {
    return false
  }

  return true
}
