import { redirect } from "@sveltejs/kit"
import type { PageServerLoad } from "./$types"
// Assuming DatabaseDefinitions.ts exports a type named Database
import type { Database } from "../../../DatabaseDefinitions"

export const load: PageServerLoad = async ({
  locals: { supabase, getSession },
}) => {
  const session = await getSession()

  if (!session) {
    throw redirect(303, "/login")
  }

  const profileResponse = await supabase
    .from("profiles")
    .select("full_name, website, company_name")
    .eq("id", session.user.id)
    .single()

  if (profileResponse.error) {
    throw new Error("Failed to fetch profile.")
  }

  const profile =
    profileResponse.data as Database["public"]["Tables"]["profiles"]["Row"]

  const journalEntriesResponse = await supabase
    .from("journal_entries")
    .select("*")
    .eq("user_id", session.user.id)

  if (journalEntriesResponse.error) {
    throw new Error("Failed to fetch journal entries.")
  }

  const journalEntries =
    journalEntriesResponse.data as Database["public"]["Tables"]["journal_entries"]["Row"][]

  return { session, profile, journalEntries }
}
