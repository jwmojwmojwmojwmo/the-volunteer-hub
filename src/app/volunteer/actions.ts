"use server";

import { getTrimmedField } from "@/lib/forms";
import { APPLICATION_STATUSES } from "@/lib/application-status";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { STAMPS, VERIFIED_STAMPS } from "@/lib/stamps";

type VerifiedStamp = (typeof VERIFIED_STAMPS)[number];

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestSkillVerification(formData: FormData): Promise<void> {
  const stamp = getTrimmedField(formData, "stamp");
  const proof = formData.get("proof");

  if (!VERIFIED_STAMPS.includes(stamp as VerifiedStamp)) {
    return;
  }

  if (!(proof instanceof File) || proof.size === 0) {
    return;
  }

  if (stamp === STAMPS.HOURS_40) {
    return;
  }

  revalidatePath("/");
}

export async function updateProfileName(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const name = getTrimmedField(formData, "name");

  if (!name) {
    return;
  }

  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/login");
  }

  await supabase.from("volunteers").update({ name }).eq("id", data.user.id);
  revalidatePath("/");
}

export async function applyToEvent(eventId: string, _formData: FormData): Promise<void> {
  void _formData;

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  const volunteerId = user?.id;

  if (!eventId || !volunteerId) {
    redirect("/login");
  }

  const [{ data: event, error: eventError }, { data: volunteerData, error: volunteerError }] = await Promise.all([
    supabase.from("events").select("id, status, max_volunteers, skills_needed").eq("id", eventId).single(),
    supabase.from("volunteers").select("id, skills").eq("id", volunteerId).single()
  ]);

  if (eventError || !event) {
    return;
  }

  if ((event.status || "").toLowerCase() !== "recruiting") {
    return;
  }

  let volunteer = volunteerData;

  if (volunteerError || !volunteer) {
    const { data: createdVolunteer } = await supabase
      .from("volunteers")
      .upsert(
        {
          id: volunteerId,
          name: user.user_metadata?.full_name || user.email || "Volunteer",
          contact_email: user.email || null,
          completed_hours: 0,
          completed_events: 0,
          rating: 0,
          skills: []
        },
        { onConflict: "id" }
      )
      .select("id, skills")
      .single();

    volunteer = createdVolunteer;
  }

  if (!volunteer) {
    return;
  }

  const { data: existingApplication } = await supabase
    .from("event_applications")
    .select("id, status")
    .eq("event_id", eventId)
    .eq("volunteer_id", volunteerId)
    .maybeSingle();

  if (existingApplication && existingApplication.status !== APPLICATION_STATUSES.WITHDRAWN) {
    return;
  }

  const needed = event?.skills_needed || [];
  const earned = volunteer?.skills || [];

  const isQualified = needed.every((skill: string) => earned.includes(skill));

  const { count: acceptedCount } = await supabase
    .from("event_applications")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("status", APPLICATION_STATUSES.ACCEPTED);

  const nextStatus = !isQualified
    ? APPLICATION_STATUSES.NEEDS_SKILL_VERIFICATION
    : (acceptedCount ?? 0) >= event.max_volunteers
      ? APPLICATION_STATUSES.WAITLISTED
      : APPLICATION_STATUSES.APPLIED;

  if (existingApplication && existingApplication.status === APPLICATION_STATUSES.WITHDRAWN) {
    await supabase
      .from("event_applications")
      .update({ status: nextStatus, applied_at: new Date().toISOString() })
      .eq("id", existingApplication.id);
    revalidatePath("/");
    revalidatePath("/org");
    return;
  }

  const { error: insertError } = await supabase.from("event_applications").insert({
    event_id: eventId,
    volunteer_id: volunteerId,
    status: nextStatus,
    applied_at: new Date().toISOString()
  });

  if (insertError) {
    return;
  }

  revalidatePath("/");
  revalidatePath("/org");
}
