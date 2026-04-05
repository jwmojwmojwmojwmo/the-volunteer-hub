"use server";

import { getTrimmedField, normalizeStringList, parseStringList } from "@/lib/forms";
import { APPLICATION_STATUSES, isPendingOrgReviewStatus } from "@/lib/application-status";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { SELF_DECLARED_STAMPS, VERIFIED_STAMPS } from "@/lib/stamps";

type RequiredSkillStamp = (typeof VERIFIED_STAMPS)[number] | (typeof SELF_DECLARED_STAMPS)[number];

async function requireOrganizationUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/org/login");
  }

  return { supabase, user: data.user };
}

async function ensureOrganizationProfile(userId: string, email: string | null, name?: string) {
  const supabase = await createClient();
  const orgName = name?.trim() || email || "Organization";

  const { data: existingOrganization } = await supabase
    .from("organizations")
    .select("id, name, contact_email")
    .eq("id", userId)
    .maybeSingle();

  if (!existingOrganization) {
    await supabase.from("organizations").insert({
      id: userId,
      name: orgName,
      contact_email: email
    });
    return;
  }

  const updates: { contact_email?: string | null; name?: string } = {};

  if (email && existingOrganization.contact_email !== email) {
    updates.contact_email = email;
  }

  if ((!existingOrganization.name || !existingOrganization.name.trim()) && orgName) {
    updates.name = orgName;
  }

  if (Object.keys(updates).length > 0) {
    await supabase.from("organizations").update(updates).eq("id", userId);
  }
}

export async function organizationSignup(formData: FormData) {
  const supabase = await createClient();

  const name = getTrimmedField(formData, "name");
  const email = getTrimmedField(formData, "email");
  const password = getTrimmedField(formData, "password");

  if (!name) {
    redirect("/org/signup?error=invalid-name");
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

  if (error) {
    redirect(`/org/signup?error=${encodeURIComponent(error.message)}`);
  }

  const { data } = await supabase.auth.getUser();
  if (data.user) {
    await ensureOrganizationProfile(
      data.user.id,
      data.user.email ?? email,
      name || data.user.user_metadata?.full_name
    );
  }

  revalidatePath("/org");
  redirect("/org");
}

export async function organizationLogin(formData: FormData) {
  const supabase = await createClient();

  const email = getTrimmedField(formData, "email");
  const password = getTrimmedField(formData, "password");

  if (!email || !email.includes("@")) {
    redirect("/org/login?error=invalid-email");
  }

  if (!password) {
    redirect("/org/login?error=invalid-password");
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect("/org/login?error=invalid-credentials");
  }

  if (data.user) {
    await ensureOrganizationProfile(data.user.id, data.user.email ?? email, data.user.user_metadata?.full_name);
  }

  revalidatePath("/org");
  redirect("/org");
}

export async function organizationSignOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/org/login");
}

export async function updateOrganizationProfileName(formData: FormData) {
  const { supabase, user } = await requireOrganizationUser();
  const name = getTrimmedField(formData, "name");

  if (!name) {
    return;
  }

  await supabase.from("organizations").update({ name }).eq("id", user.id);
  revalidatePath("/org");
}

export async function updateOrganizationProfileDetails(formData: FormData) {
  const { supabase, user } = await requireOrganizationUser();
  const name = getTrimmedField(formData, "name");
  const contactEmail = getTrimmedField(formData, "contactEmail") || null;

  const updates: { name?: string; contact_email?: string | null } = {};

  if (name) {
    updates.name = name;
  }

  updates.contact_email = contactEmail;

  await supabase.from("organizations").update(updates).eq("id", user.id);

  revalidatePath("/org");
  revalidatePath("/org/profile");
  revalidatePath(`/organizations/${user.id}`);
  redirect("/org/profile");
}

export async function hideCompletedEventFromDashboard(formData: FormData) {
  const { supabase, user } = await requireOrganizationUser();
  const eventId = getTrimmedField(formData, "eventId");

  if (!eventId) {
    return;
  }

  const { data: event } = await supabase
    .from("events")
    .select("id, org_id, status")
    .eq("id", eventId)
    .maybeSingle();

  if (!event || event.org_id !== user.id) {
    return;
  }

  if ((event.status || "").toLowerCase() !== "completed") {
    return;
  }

  await supabase
    .from("events")
    .update({ hidden_from_org_dashboard: true })
    .eq("id", eventId);

  revalidatePath("/org");
}

export async function createOrganizationEvent(formData: FormData) {
  const { supabase, user } = await requireOrganizationUser();

  const title = getTrimmedField(formData, "eventTitle");
  const description = getTrimmedField(formData, "eventDescription") || null;
  const address = getTrimmedField(formData, "eventAddress");
  const hoursGiven = Number(getTrimmedField(formData, "volunteerHours") || "0");
  const maxVolunteers = Number(getTrimmedField(formData, "maxVolunteers") || "1");
  const compensation = parseStringList(getTrimmedField(formData, "compensationOptions"));
  const submittedTags = formData.getAll("eventTags").map((value) => String(value));
  const tags = normalizeStringList(submittedTags);
  const selectedSkills = formData.getAll("requiredSkills").map((value) => String(value));
  const legacySkills = parseStringList(getTrimmedField(formData, "requiredSkills"));
  const allowedSkills = new Set<RequiredSkillStamp>([...VERIFIED_STAMPS, ...SELF_DECLARED_STAMPS]);
  const isAllowedSkill = (skill: string): skill is RequiredSkillStamp =>
    allowedSkills.has(skill as RequiredSkillStamp);
  const skillsNeededRaw = selectedSkills.length > 0 ? selectedSkills : legacySkills;
  const hasInvalidSkill = skillsNeededRaw.some((skill) => !isAllowedSkill(skill));
  const skillsNeeded = [...new Set(skillsNeededRaw)].filter(isAllowedSkill);
  const latRaw = getTrimmedField(formData, "locationLatitude");
  const lngRaw = getTrimmedField(formData, "locationLongitude");
  const lat = Number(latRaw);
  const lng = Number(lngRaw);

  if (!title) {
    redirect("/org/events/new?error=title-required");
  }

  if (!address) {
    redirect("/org/events/new?error=address-required");
  }

  if (!latRaw || !lngRaw) {
    redirect("/org/events/new?error=location-required");
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    redirect("/org/events/new?error=invalid-location");
  }

  if (hasInvalidSkill) {
    redirect("/org/events/new?error=invalid-required-skills");
  }

  const payload: {
    org_id: string;
    title: string;
    description: string | null;
    address: string;
    hours_given: number;
    compensation: string[] | null;
    skills_needed: string[] | null;
    lat: number;
    lng: number;
    max_volunteers: number;
    status: string;
  } = {
    org_id: user.id,
    title,
    description,
    address,
    hours_given: Number.isFinite(hoursGiven) ? hoursGiven : 0,
    compensation: compensation.length > 0 ? compensation : null,
    skills_needed: skillsNeeded.length > 0 ? skillsNeeded : null,
    lat,
    lng,
    max_volunteers: Number.isFinite(maxVolunteers) && maxVolunteers > 0 ? maxVolunteers : 1,
    status: "recruiting"
  };

  const { data: createdEvent, error } = await supabase
    .from("events")
    .insert(payload)
    .select("id")
    .single();

  if (error || !createdEvent) {
    const message = error?.message || "Could not create event";
    redirect(`/org/events/new?error=${encodeURIComponent(message)}`);
  }

  if (tags.length > 0) {
    const tagIds: string[] = [];

    for (const tagName of tags) {
      const { data: existingTag } = await supabase
        .from("tags")
        .select("id")
        .ilike("name", tagName)
        .maybeSingle();

      if (existingTag?.id) {
        tagIds.push(existingTag.id);
        continue;
      }

      const { data: insertedTag } = await supabase
        .from("tags")
        .insert({ name: tagName })
        .select("id")
        .single();

      if (insertedTag?.id) {
        tagIds.push(insertedTag.id);
      }
    }

    if (tagIds.length > 0) {
      const links = tagIds.map((tagId) => ({ event_id: createdEvent.id, tag_id: tagId }));
      await supabase.from("event_tags").insert(links);
    }
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("hosted_events")
    .eq("id", user.id)
    .maybeSingle();

  if (org) {
    await supabase
      .from("organizations")
      .update({ hosted_events: (org.hosted_events ?? 0) + 1 })
      .eq("id", user.id);
  }

  revalidatePath("/org");
  redirect("/org");
}

async function updateEventStatusForCapacity(eventId: string, maxVolunteers: number) {
  const supabase = await createClient();

  const { count: acceptedCount } = await supabase
    .from("event_applications")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("status", APPLICATION_STATUSES.ACCEPTED);

  const isFilled = (acceptedCount ?? 0) >= maxVolunteers;

  await supabase
    .from("events")
    .update({ status: isFilled ? "ongoing" : "recruiting" })
    .eq("id", eventId);
}

async function reopenNextWaitlistedApplication(eventId: string) {
  const supabase = await createClient();

  const { data: nextWaitlisted } = await supabase
    .from("event_applications")
    .select("id")
    .eq("event_id", eventId)
    .eq("status", APPLICATION_STATUSES.WAITLISTED)
    .order("applied_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!nextWaitlisted) {
    return;
  }

  await supabase
    .from("event_applications")
    .update({ status: APPLICATION_STATUSES.APPLIED })
    .eq("id", nextWaitlisted.id);
}

export async function acceptApplication(formData: FormData) {
  const { supabase, user } = await requireOrganizationUser();

  const applicationId = getTrimmedField(formData, "applicationId");

  if (!applicationId) {
    return;
  }

  const { data: application } = await supabase
    .from("event_applications")
    .select("id, event_id, status, events!inner(id, org_id, max_volunteers)")
    .eq("id", applicationId)
    .single();

  const eventRow = Array.isArray(application?.events) ? application.events[0] : application?.events;

  if (!application || !eventRow || eventRow.org_id !== user.id) {
    return;
  }

  if (!isPendingOrgReviewStatus(application.status)) {
    return;
  }

  const { count: acceptedCount } = await supabase
    .from("event_applications")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventRow.id)
    .eq("status", APPLICATION_STATUSES.ACCEPTED);

  const isAtCapacity = (acceptedCount ?? 0) >= eventRow.max_volunteers;

  if (isAtCapacity) {
    await supabase
      .from("event_applications")
      .update({ status: APPLICATION_STATUSES.WAITLISTED })
      .eq("id", applicationId);

    revalidatePath("/org");
    revalidatePath("/");
    return;
  }

  await supabase
    .from("event_applications")
    .update({ status: APPLICATION_STATUSES.ACCEPTED })
    .eq("id", applicationId);
  await updateEventStatusForCapacity(eventRow.id, eventRow.max_volunteers);

  revalidatePath("/org");
  revalidatePath("/");
}

export async function declineApplication(formData: FormData) {
  const { supabase, user } = await requireOrganizationUser();

  const applicationId = getTrimmedField(formData, "applicationId");

  if (!applicationId) {
    return;
  }

  const { data: application } = await supabase
    .from("event_applications")
    .select("id, event_id, status, events!inner(id, org_id, max_volunteers)")
    .eq("id", applicationId)
    .single();

  const eventRow = Array.isArray(application?.events) ? application.events[0] : application?.events;

  if (!application || !eventRow || eventRow.org_id !== user.id) {
    return;
  }

  const wasAccepted = application.status === APPLICATION_STATUSES.ACCEPTED;

  await supabase
    .from("event_applications")
    .update({ status: APPLICATION_STATUSES.DECLINED })
    .eq("id", applicationId);

  if (wasAccepted) {
    await reopenNextWaitlistedApplication(eventRow.id);
  }

  await updateEventStatusForCapacity(eventRow.id, eventRow.max_volunteers);

  revalidatePath("/org");
  revalidatePath("/");
}
