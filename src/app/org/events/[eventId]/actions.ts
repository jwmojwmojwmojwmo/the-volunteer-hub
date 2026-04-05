"use server";

import { APPLICATION_STATUSES } from "@/lib/application-status";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type AttendanceActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const ATTENDANCE_INITIAL_STATE: AttendanceActionState = {
  status: "idle",
  message: ""
};

function clampRating(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(5, Math.max(1, Math.round(value)));
}

async function requireOrganizationUser() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;

  if (!user) {
    redirect("/org/login");
  }

  return { supabase, user };
}

async function requireManagedEvent(eventId: string) {
  const { supabase, user } = await requireOrganizationUser();

  const { data: event } = await supabase
    .from("events")
    .select("id, org_id, title, hours_given, status")
    .eq("id", eventId)
    .maybeSingle();

  if (!event || event.org_id !== user.id) {
    redirect("/org");
  }

  return { supabase, user, event };
}

async function recalculateVolunteerRating(supabase: Awaited<ReturnType<typeof createClient>>, volunteerId: string) {
  const { data: ratedApplications } = await supabase
    .from("event_applications")
    .select("org_rating")
    .eq("volunteer_id", volunteerId)
    .eq("attended", true)
    .not("org_rating", "is", null);

  const ratings = (ratedApplications ?? [])
    .map((application) => application.org_rating)
    .filter((rating): rating is number => typeof rating === "number");

  const nextRating = ratings.length > 0 ? ratings.reduce((total, rating) => total + rating, 0) / ratings.length : 0;

  await supabase.from("volunteers").update({ rating: Number(nextRating.toFixed(1)) }).eq("id", volunteerId);
}

async function getOrCreateVolunteer(
  supabase: Awaited<ReturnType<typeof createClient>>,
  volunteerId: string
) {
  let { data: volunteer } = await supabase
    .from("volunteers")
    .select("id, name, contact_email, completed_hours, completed_events, rating, skills")
    .eq("id", volunteerId)
    .maybeSingle();

  if (!volunteer) {
    const { data: createdVolunteer } = await supabase
      .from("volunteers")
      .insert({
        id: volunteerId,
        name: `Volunteer ${volunteerId.slice(0, 8)}`,
        contact_email: null,
        completed_hours: 0,
        completed_events: 0,
        rating: 0,
        skills: []
      })
      .select("id, name, contact_email, completed_hours, completed_events, rating, skills")
      .single();

    volunteer = createdVolunteer;
  }

  if (!volunteer) {
    return null;
  }

  return volunteer;
}

async function updateVolunteerProgressForAttendanceChange(
  supabase: Awaited<ReturnType<typeof createClient>>,
  volunteerId: string,
  hoursGiven: number,
  wasAttended: boolean,
  isAttended: boolean
) {
  if (wasAttended === isAttended) {
    return;
  }

  const volunteer = await getOrCreateVolunteer(supabase, volunteerId);

  if (!volunteer) {
    return;
  }

  const hoursDelta = isAttended ? hoursGiven : -hoursGiven;
  const eventsDelta = isAttended ? 1 : -1;

  const nextCompletedHours = Math.max(0, (volunteer.completed_hours ?? 0) + hoursDelta);
  const nextCompletedEvents = Math.max(0, (volunteer.completed_events ?? 0) + eventsDelta);

  await supabase
    .from("volunteers")
    .update({
      completed_hours: nextCompletedHours,
      completed_events: nextCompletedEvents
    })
    .eq("id", volunteerId);
}

export async function saveEventAttendance(
  previousState: AttendanceActionState = ATTENDANCE_INITIAL_STATE,
  formData: FormData
): Promise<AttendanceActionState> {
  void previousState;

  const eventId = String(formData.get("eventId") ?? "").trim();
  const applicationId = String(formData.get("applicationId") ?? "").trim();
  const attendanceStatus = String(formData.get("attendanceStatus") ?? "absent").trim();
  const attended = attendanceStatus === "present";
  const ratingRaw = String(formData.get("orgRating") ?? "").trim();
  const rating = ratingRaw ? clampRating(Number(ratingRaw)) : null;

  if (!eventId || !applicationId) {
    return {
      status: "error",
      message: "Missing event or volunteer record."
    };
  }

  const { supabase, event } = await requireManagedEvent(eventId);

  if ((event.status || "").toLowerCase() === "completed") {
    return {
      status: "error",
      message: "This event is already completed, so attendance is locked."
    };
  }

  const { data: application } = await supabase
    .from("event_applications")
    .select("id, event_id, volunteer_id, status, attended")
    .eq("id", applicationId)
    .maybeSingle();

  if (!application || application.event_id !== eventId) {
    return {
      status: "error",
      message: "Could not find that volunteer application."
    };
  }

  if (application.status !== APPLICATION_STATUSES.ACCEPTED) {
    return {
      status: "error",
      message: "Only accepted volunteers can be marked for attendance."
    };
  }

  await supabase
    .from("event_applications")
    .update({ attended, org_rating: attended ? rating : null })
    .eq("id", application.id);

  await updateVolunteerProgressForAttendanceChange(
    supabase,
    application.volunteer_id,
    event.hours_given,
    Boolean(application.attended),
    attended
  );
  await recalculateVolunteerRating(supabase, application.volunteer_id);

  revalidatePath(`/org/events/${eventId}`);
  revalidatePath("/org");
  revalidatePath("/");

  return {
    status: "success",
    message: attended
      ? "Saved: volunteer marked present."
      : "Saved: volunteer marked absent/not present."
  };
}

export async function endOrganizationEvent(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "").trim();

  if (!eventId) {
    return;
  }

  const { supabase, event } = await requireManagedEvent(eventId);

  if ((event.status || "").toLowerCase() === "completed") {
    return;
  }

  await supabase.from("events").update({ status: "completed" }).eq("id", eventId);

  revalidatePath(`/org/events/${eventId}`);
  revalidatePath("/org");
  revalidatePath("/");
}
