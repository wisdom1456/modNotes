import { fail, redirect } from "@sveltejs/kit"

export const actions = {
  updateEmail: async ({ request, locals: { supabase, getSession } }) => {
    const formData = await request.formData()
    const email = formData.get("email") as string

    let validationError
    if (!email || email === "") {
      validationError = "An email address is required"
    }
    // Dead simple check -- there's no standard here (which is followed),
    // and lots of errors will be missed until we actually email to verify, so
    // just do that
    else if (!email.includes("@")) {
      validationError = "A valid email address is required"
    }
    if (validationError) {
      return fail(400, {
        errorMessage: validationError,
        errorFields: ["email"],
        email,
      })
    }

    const session = await getSession()

    const { error } = await supabase.auth.updateUser({ email: email })

    if (error) {
      return fail(500, {
        errorMessage: "Unknown error. If this persists please contact us.",
        email,
      })
    }

    return {
      email,
    }
  },
  updatePassword: async ({ request, locals: { supabase, getSession } }) => {
    const session = await getSession()
    if (!session) {
      throw redirect(303, "/login")
    }

    const formData = await request.formData()
    const newPassword1 = formData.get("newPassword1") as string
    const newPassword2 = formData.get("newPassword2") as string
    const currentPassword = formData.get("currentPassword") as string

    // Can check if we're a "password recovery" session by checking session amr
    // let currentPassword take priority if provided (user can use either form)
    let recoveryAmr = session.user?.amr?.find((x) => x.method === "recovery")
    const isRecoverySession = recoveryAmr && !currentPassword

    // if this is password recovery session, check timestamp of recovery session
    if (isRecoverySession) {
      let timeSinceLogin = Date.now() - recoveryAmr.timestamp * 1000
      if (timeSinceLogin > 1000 * 60 * 15) {
        // 15 mins in milliseconds
        return fail(400, {
          errorMessage:
            'Recovery code expired. Please log out, then use "Forgot Password" on the sign in page to reset your password. Codes are valid for 15 minutes.',
          errorFields: [],
          newPassword1,
          newPassword2,
          currentPassword: "",
        })
      }
    }

    let validationError
    let errorFields = []
    if (!newPassword1) {
      validationError = "You must type a new password"
      errorFields.push("newPassword1")
    }
    if (!newPassword2) {
      validationError = "You must type the new password twice"
      errorFields.push("newPassword2")
    }
    if (newPassword1.length < 6) {
      validationError = "The new password must be at least 6 charaters long"
      errorFields.push("newPassword1")
    }
    if (newPassword1.length > 72) {
      validationError = "The new password can be at most 72 charaters long"
      errorFields.push("newPassword1")
    }
    if (newPassword1 != newPassword2) {
      validationError = "The passwords don't match"
      errorFields.push("newPassword1")
      errorFields.push("newPassword2")
    }
    if (!currentPassword && !isRecoverySession) {
      validationError =
        "You must include your current password. If you forgot it, sign out then use 'forgot password' on the sign in page."
      errorFields.push("currentPassword")
    }
    if (validationError) {
      return fail(400, {
        errorMessage: validationError,
        errorFields: [...new Set(errorFields)], // unique values
        newPassword1,
        newPassword2,
        currentPassword,
      })
    }

    // Check current password is correct before updating, but only if they didn't log in with "recover" link
    // Note: to make this truely enforced you need to contact supabase. See: https://www.reddit.com/r/Supabase/comments/12iw7o1/updating_password_in_supabase_seems_insecure/
    // However, having the UI accessible route still verify password is still helpful, and needed once you get the setting above enabled
    if (!isRecoverySession) {
      const { error } = await supabase.auth.signInWithPassword({
        email: session?.user.email || "",
        password: currentPassword,
      })
      if (error) {
        // The user was logged out because of bad password. Redirect to error page explaining.
        throw redirect(303, "/login/current_password_error")
      }
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword1,
    })
    if (error) {
      return fail(500, {
        errorMessage: "Unknown error. If this persists please contact us.",
        newPassword1,
        newPassword2,
        currentPassword,
      })
    }

    return {
      newPassword1,
      newPassword2,
      currentPassword,
    }
  },
  deleteAccount: async ({
    request,
    locals: { supabase, supabaseServiceRole, getSession },
  }) => {
    const session = await getSession()
    if (!session) {
      throw redirect(303, "/login")
    }

    const formData = await request.formData()
    const currentPassword = formData.get("currentPassword") as string

    if (!currentPassword) {
      return fail(400, {
        errorMessage:
          "You must provide your current password to delete your account. If you forgot it, sign out then use 'forgot password' on the sign in page.",
        errorFields: ["currentPassword"],
        currentPassword,
      })
    }

    // Check current password is correct before deleting account
    const { error: pwError } = await supabase.auth.signInWithPassword({
      email: session?.user.email || "",
      password: currentPassword,
    })
    if (pwError) {
      // The user was logged out because of bad password. Redirect to error page explaining.
      throw redirect(303, "/login/current_password_error")
    }

    const { error } = await supabaseServiceRole.auth.admin.deleteUser(
      session.user.id,
      true,
    )
    if (error) {
      return fail(500, {
        errorMessage: "Unknown error. If this persists please contact us.",
        currentPassword,
      })
    }

    await supabase.auth.signOut()
    throw redirect(303, "/")
  },
  updateProfile: async ({ request, locals: { supabase, getSession } }) => {
    const formData = await request.formData()
    const fullName = formData.get("fullName") as string
    const companyName = formData.get("companyName") as string
    const website = formData.get("website") as string

    let validationError
    let errorFields = []
    if (!fullName) {
      validationError = "Name is required"
      errorFields.push("fullName")
    }
    if (!companyName) {
      validationError =
        "Company name is required. If this is a hobby project or personal app, please put your name."
      errorFields.push("companyName")
    }
    if (!website) {
      validationError =
        "Company website is required. An app store URL is a good alternative if you don't have a website."
      errorFields.push("website")
    }
    if (validationError) {
      return fail(400, {
        errorMessage: validationError,
        errorFields,
        fullName,
        companyName,
        website,
      })
    }

    const session = await getSession()

    const { error } = await supabase.from("profiles").upsert({
      id: session?.user.id,
      full_name: fullName,
      company_name: companyName,
      website: website,
      updated_at: new Date(),
    })

    if (error) {
      return fail(500, {
        errorMessage: "Unknown error. If this persists please contact us.",
        fullName,
        companyName,
        website,
      })
    }

    return {
      fullName,
      companyName,
      website,
    }
  },
  signout: async ({ locals: { supabase, getSession } }) => {
    const session = await getSession()
    if (session) {
      await supabase.auth.signOut()
      throw redirect(303, "/")
    }
  },
  // Action to create a new journal entry
  createJournalEntry: async ({ request, locals: { supabase, getSession } }) => {
    const session = await getSession()
    if (!session) {
      return fail(400, { errorMessage: "Not authenticated" })
    }

    const formData = await request.formData()
    const title = formData.get("title") as string
    const tags = formData.getAll("tags") as string[] // Assuming tags are sent as multiple form fields with the same name
    const userText = formData.get("user_text") as string
    const aiGeneratedText = formData.get("ai_generated_text") as string
    const aiGeneratedImageUrl = formData.get("ai_generated_image_url") as string
    const entryDate = formData.get("entry_date")
      ? new Date(formData.get("entry_date") as string)
      : new Date()
    const moodIndicator = formData.get("mood_indicator") as string
    const weather = formData.get("weather") as string
    const location = formData.get("location") as string
    const wordCount = parseInt(formData.get("word_count") as string) || 0
    const privacyLevel = formData.get("privacy_level") as string
    const dailyQuote = formData.get("daily_quote") as string
    const entryType = formData.get("entry_type") as string
    const bookmarkFlag = formData.get("bookmark_flag") === "true"
    const status = formData.get("status") as string
    const imageUrl = formData.get("image_url") as string
    const audioUrl = formData.get("audio_url") as string
    const timeSpent = formData.get("time_spent") as string // Assuming this is sent as a string like "01:00:00"

    // Validate required fields
    if (!title || !userText) {
      return fail(400, { errorMessage: "Title and text are required" })
    }

    // Insert into database
    const { error } = await supabase.from("journal_entries").insert([
      {
        user_id: session.user.id,
        title,
        tags,
        user_text: userText,
        ai_generated_text: aiGeneratedText,
        ai_generated_image_url: aiGeneratedImageUrl,
        entry_date: entryDate,
        mood_indicator: moodIndicator,
        weather,
        location,
        word_count: wordCount,
        privacy_level: privacyLevel,
        daily_quote: dailyQuote,
        entry_type: entryType,
        bookmark_flag: bookmarkFlag,
        status,
        image_url: imageUrl,
        audio_url: audioUrl,
        time_spent: timeSpent ? `interval '${timeSpent}'` : null, // Assuming correct format for interval
      },
    ])

    if (error) {
      return fail(500, { errorMessage: "Could not create journal entry" })
    }

    return {} // You might want to return something like an ID or confirmation message
  },

  updateJournalEntry: async ({ request, locals: { supabase, getSession } }) => {
    const session = await getSession()
    const formData = await request.formData()
    const id = formData.get("id") as string
    const title = formData.get("title") as string
    const tags = formData.getAll("tags") as string[] // Assuming tags are sent as multiple form fields with the same name
    const userText = formData.get("user_text") as string
    const aiGeneratedText = formData.get("ai_generated_text") as string
    const aiGeneratedImageUrl = formData.get("ai_generated_image_url") as string
    const entryDate = formData.get("entry_date")
      ? new Date(formData.get("entry_date") as string)
      : new Date()
    const moodIndicator = formData.get("mood_indicator") as string
    const weather = formData.get("weather") as string
    const location = formData.get("location") as string
    const wordCount = parseInt(formData.get("word_count") as string) || 0
    const privacyLevel = formData.get("privacy_level") as string
    const dailyQuote = formData.get("daily_quote") as string
    const entryType = formData.get("entry_type") as string
    const bookmarkFlag = formData.get("bookmark_flag") === "true"
    const status = formData.get("status") as string
    const imageUrl = formData.get("image_url") as string
    const audioUrl = formData.get("audio_url") as string
    const timeSpent = formData.get("time_spent") as string // Assuming this is sent as a string like "01:00:00"

    // Perform validation checks here
    if (!id) {
      return fail(400, {
        errorMessage: "ID is required to update journal entry.",
      })
    }

    if (!title) {
      return fail(400, {
        errorMessage: "Title is required to update journal entry.",
      })
    }

    if (!userText) {
      return fail(400, {
        errorMessage: "Text is required to update journal entry.",
      })
    }
    if (!entryDate) {
      return fail(400, {
        errorMessage: "Entry date is required to update journal entry.",
      })
    }
    if (!moodIndicator) {
      return fail(400, {
        errorMessage: "Mood indicator is required to update journal entry.",
      })
    }
    if (!weather) {
      return fail(400, {
        errorMessage: "Weather is required to update journal entry.",
      })
    }
    if (!location) {
      return fail(400, {
        errorMessage: "Location is required to update journal entry.",
      })
    }
    if (!privacyLevel) {
      return fail(400, {
        errorMessage: "Privacy level is required to update journal entry.",
      })
    }
    if (!entryType) {
      return fail(400, {
        errorMessage: "Entry type is required to update journal entry.",
      })
    }
    if (!status) {
      return fail(400, {
        errorMessage: "Status is required to update journal entry.",
      })
    }

    const { error } = await supabase
      .from("journal_entries")
      .update({
        title,
        tags,
        user_text: userText,
        ai_generated_text: aiGeneratedText,
        ai_generated_image_url: aiGeneratedImageUrl,
        entry_date: entryDate,
        mood_indicator: moodIndicator,
        weather,
        location,
        word_count: wordCount,
        privacy_level: privacyLevel,
        daily_quote: dailyQuote,
        entry_type: entryType,
        bookmark_flag: bookmarkFlag,
        status,
        image_url: imageUrl,
        audio_url: audioUrl,
        time_spent: timeSpent ? `interval '${timeSpent}'` : null, // Assuming correct format for interval
      })
      .eq("id", id)
      .eq("user_id", session?.user?.id) // Ensure users can only update their entries

    if (error) {
      return fail(500, { errorMessage: "Failed to update journal entry." })
    }

    return { message: "Journal entry updated successfully." }
  },

  deleteJournalEntry: async ({ request, locals: { supabase, getSession } }) => {
    const session = await getSession()
    const formData = await request.formData()
    const id = formData.get("id") as string

    const { error } = await supabase
      .from("journal_entries")
      .delete()
      .eq("id", id)
      .eq("user_id", session.user.id) // Ensure users can only delete their entries

    if (error) {
      return fail(500, { errorMessage: "Failed to delete journal entry." })
    }

    return { message: "Journal entry deleted successfully." }
  },

  // Action to get all journal entries for the user
  getJournalEntries: async ({ locals: { supabase } }) => {
    const userResponse = await supabase.auth.getUser()

    // Check if the user data is successfully retrieved
    if (!userResponse.data.user) {
      return fail(400, { errorMessage: "Not authenticated" })
    }

    // Now you can safely access user.id
    const userId = userResponse.data.user.id

    const { data, error } = await supabase
      .from("journal_entries")
      .select(
        `
      id,
      title,
      tags,
      user_text,
      ai_generated_text,
      ai_generated_image_url,
      entry_date,
      mood_indicator,
      weather,
      location,
      word_count,
      privacy_level,
      daily_quote,
      entry_type,
      bookmark_flag,
      status,
      image_url,
      audio_url,
      time_spent
    `,
      ) // Selecting specific fields
      .eq("user_id", userId) // Use the userId variable
      .order("entry_date", { ascending: false })

    if (error) {
      return fail(500, {
        errorMessage: "Could not get journal entries",
        details: error.message,
      })
    }

    return { journalEntries: data }
  },
}
