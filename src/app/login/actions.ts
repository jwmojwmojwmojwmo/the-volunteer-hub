"use server";

import { createClient } from "@/lib/supabase/server";
import { getTrimmedField } from "@/lib/forms";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function ensureVolunteerProfile(userId: string, email: string | null, fullName?: string | null) {
  const supabase = await createClient();
  const fallbackName = (fullName || "").trim() || email || "Volunteer";

  const { data: existingVolunteer } = await supabase
    .from("volunteers")
    .select("id, name, contact_email, completed_hours, completed_events, rating, skills")
    .eq("id", userId)
    .maybeSingle();

  await supabase.from("volunteers").upsert(
    {
      id: userId,
      name: (existingVolunteer?.name || "").trim() || fallbackName,
      contact_email: existingVolunteer?.contact_email || email,
      completed_hours: existingVolunteer?.completed_hours ?? 0,
      completed_events: existingVolunteer?.completed_events ?? 0,
      rating: existingVolunteer?.rating ?? 0,
      skills: existingVolunteer?.skills ?? []
    },
    { onConflict: "id" }
  );
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const name = getTrimmedField(formData, "name");
  const email = getTrimmedField(formData, "email");
  const password = getTrimmedField(formData, "password");

  if (!name) {
    redirect("/signup?error=invalid-name");
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name
      }
    }
  });

  const { data: signedUpUser } = await supabase.auth.getUser();

  if (signedUpUser.user) {
    await ensureVolunteerProfile(
      signedUpUser.user.id,
      email,
      name || signedUpUser.user.user_metadata?.full_name
    );
  }

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/");
  redirect("/");
}

export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = getTrimmedField(formData, "email");
  const password = getTrimmedField(formData, "password");

  if (!email || !email.includes("@")) {
    redirect("/login?error=invalid-email");
  }

  if (!password) {
    redirect("/login?error=invalid-password");
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect("/login?error=invalid-credentials");
  }

  if (data.user) {
    await ensureVolunteerProfile(data.user.id, data.user.email ?? email, data.user.user_metadata?.full_name);
  }

  revalidatePath("/");
  redirect("/");
}