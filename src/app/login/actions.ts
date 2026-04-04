"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function getTrimmedField(formData: FormData, key: string) {
  return (formData.get(key) as string | null)?.trim() ?? "";
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const email = getTrimmedField(formData, "email");
  const password = getTrimmedField(formData, "password");

  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  const { data: signedUpUser } = await supabase.auth.getUser();

  if (signedUpUser.user) {
    await supabase.from("volunteers").upsert(
      {
        id: signedUpUser.user.id,
        name: signedUpUser.user.user_metadata?.full_name || email,
        contact_email: email,
        completed_hours: 0,
        completed_events: 0,
        rating: 0,
        skills: []
      },
      { onConflict: "id" }
    );
  }

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
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

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect("/login?error=invalid-credentials");
  }

  revalidatePath("/");
  redirect("/");
}