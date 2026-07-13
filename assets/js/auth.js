/* ============================================================
   Valleblond Photography
   Authentification et contrôle d'accès Studio
   ============================================================ */

async function getCurrentUser() {
    const { data, error } = await supabaseClient.auth.getUser();

    return error ? null : data.user;
}

async function signIn(email, password) {
    const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        return { success: false, message: error.message };
    }

    return { success: true };
}

async function isStudioAdmin(userId) {
    const { data, error } = await supabaseClient
        .from("studio_admins")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();

    if (error) {
        const missingTable = error.code === "42P01" || error.code === "PGRST205";

        return { allowed: false, setupRequired: missingTable };
    }

    return { allowed: Boolean(data), setupRequired: false };
}

async function signOut() {
    await supabaseClient.auth.signOut();
}
