import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STAMP_LABELS } from "@/lib/stamps";
import ReloadButton from "@/components/ReloadButton";
import OrgHeaderNav from "@/app/org/_components/OrgHeaderNav";
import { acceptApplication, declineApplication } from "../../actions";
import { endOrganizationEvent } from "./actions";
import AttendanceUpdateForm from "./AttendanceUpdateForm";
import {
  buildVolunteersById,
  getAttendanceLabel,
  getVolunteerDisplayName,
  splitApplicationsByStatus,
  type EventVolunteerApplication,
  type VolunteerSummary
} from "./view-model";

type EventManagementPageProps = {
  params: Promise<{
    eventId: string;
  }>;
};

export default async function EventManagementPage({ params }: EventManagementPageProps) {
  const { eventId } = await params;
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;

  if (!user) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-8">
        <div className="paper-panel rounded-[1.75rem] p-6">
          <p className="kicker">Organization access</p>
          <h1 className="display-font mt-2 text-3xl font-semibold text-slate-900">Sign in required</h1>
          <p className="mt-2 text-sm text-slate-600">Please sign in to manage organization events.</p>
          <Link href="/org/login" className="mt-4 inline-flex rounded-full primary-action px-4 py-2 text-sm font-semibold">
            Go to organization login
          </Link>
        </div>
      </main>
    );
  }

  const { data: event } = await supabase
    .from("events")
    .select("id, title, description, address, status, hours_given, max_volunteers, created_at, org_id, skills_needed")
    .eq("id", eventId)
    .eq("org_id", user.id)
    .maybeSingle();

  if (!event) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-8">
        <div className="paper-panel rounded-[1.75rem] p-6">
          <p className="kicker">Organization access</p>
          <h1 className="display-font mt-2 text-3xl font-semibold text-slate-900">Event not found</h1>
          <p className="mt-2 text-sm text-slate-600">This event does not belong to your organization, or it no longer exists.</p>
          <Link href="/org/events" className="mt-4 inline-flex rounded-full primary-action px-4 py-2 text-sm font-semibold">
            Back to events
          </Link>
        </div>
      </main>
    );
  }

  const { data: applicationsData } = await supabase
    .from("event_applications")
    .select("id, volunteer_id, status, attended, org_rating, applied_at")
    .eq("event_id", eventId)
    .order("applied_at", { ascending: true });

  const applications = (applicationsData ?? []) as EventVolunteerApplication[];
  const volunteerIds = [...new Set(applications.map((application) => application.volunteer_id))];
  const { data: volunteersData } = volunteerIds.length
    ? await supabase
        .from("volunteers")
        .select("id, name, contact_email, skills, completed_hours, completed_events, rating")
        .in("id", volunteerIds)
    : { data: [] };
  const volunteersById = buildVolunteersById((volunteersData ?? []) as VolunteerSummary[]);

  const { acceptedApplications, appliedApplications } = splitApplicationsByStatus(applications);
  const attendedCount = acceptedApplications.filter((application) => application.attended).length;
  const attendedVolunteerIds = [...new Set(
    acceptedApplications
      .filter((application) => application.attended)
      .map((application) => application.volunteer_id)
  )];
  const { data: attendeeReviews } = attendedVolunteerIds.length
    ? await supabase
        .from("organization_reviews")
        .select("rating, volunteer_id")
        .eq("org_id", user.id)
        .in("volunteer_id", attendedVolunteerIds)
    : { data: [] };
  const averageVolunteerEventRating = (attendeeReviews ?? []).length > 0
    ? (attendeeReviews ?? []).reduce((sum, review) => sum + Number(review.rating), 0) / (attendeeReviews ?? []).length
    : 0;
  const isCompleted = (event.status || "").toLowerCase() === "completed";
  const requiredSkills: string[] = Array.isArray(event.skills_needed) ? (event.skills_needed as string[]) : [];

  const getSkillLabel = (skill: string) => STAMP_LABELS[skill as keyof typeof STAMP_LABELS] || skill;

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="paper-panel rounded-[1.6rem] px-4 py-4 sm:px-5 sm:py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <OrgHeaderNav isSignedIn />
            <ReloadButton label="Refresh event" />
          </div>
        </section>

        <section className="paper-panel rounded-[2rem] p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="display-font text-3xl font-semibold text-slate-900">{event.title}</h1>
                <span className="stamp-pill rounded-full px-3 py-1 text-xs font-semibold">{event.status}</span>
              </div>
              <p className="mt-2 text-sm text-slate-600">{event.description || "No description provided."}</p>
              <p className="mt-2 text-sm text-slate-600">Address: {event.address || "Not specified"}</p>
              <p className="mt-2 text-xs text-slate-500">Hours credited when the event is ended: {event.hours_given}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {!isCompleted ? (
                <form action={endOrganizationEvent}>
                  <input type="hidden" name="eventId" value={event.id} />
                  <button type="submit" className="rounded-full primary-action px-3 py-2 text-sm font-semibold">
                    End event
                  </button>
                </form>
              ) : (
                <span className="rounded-full secondary-action px-3 py-2 text-sm font-semibold">
                  Event completed
                </span>
              )}
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-[1.15rem] border border-slate-200 bg-white/80 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Accepted</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{acceptedApplications.length}</p>
            </div>
            <div className="rounded-[1.15rem] border border-slate-200 bg-white/80 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Applied</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{appliedApplications.length}</p>
            </div>
            <div className="rounded-[1.15rem] border border-slate-200 bg-white/80 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Showed up</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{attendedCount}</p>
            </div>
            <div className="rounded-[1.15rem] border border-slate-200 bg-white/80 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Average rating</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{averageVolunteerEventRating > 0 ? `${averageVolunteerEventRating.toFixed(1)} / 5.0` : "No ratings yet"}</p>
            </div>
          </div>
        </section>

        <section className="paper-panel rounded-[1.75rem] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="kicker">Attendance</p>
              <h2 className="display-font mt-1 text-2xl font-semibold text-slate-900">Accepted volunteers</h2>
              <p className="mt-2 text-sm text-slate-600">Mark who showed up, rate them, and close the event once everyone is recorded.</p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {acceptedApplications.length > 0 ? (
              acceptedApplications.map((application) => {
                const volunteer = volunteersById.get(application.volunteer_id);
                const displayName = getVolunteerDisplayName(application.volunteer_id, volunteer?.name);

                return (
                  <article key={application.id} className="rounded-[1.35rem] border border-slate-200 bg-white/80 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="display-font text-xl font-semibold text-slate-900">{displayName}</p>
                        <p className="mt-1 text-sm text-slate-600">{volunteer?.contact_email || "No email"}</p>
                        <p className="mt-1 text-xs text-slate-500">{getAttendanceLabel(Boolean(application.attended))}</p>
                        {volunteer?.contact_email ? (
                          <a
                            href={`mailto:${volunteer.contact_email}`}
                            className="mt-1 inline-flex text-xs font-semibold text-slate-900 underline decoration-2 underline-offset-4"
                          >
                            Email volunteer
                          </a>
                        ) : null}
                      </div>
                      <span className="stamp-pill rounded-full px-3 py-1 text-xs font-semibold">
                        Your rating for volunteer: {application.org_rating ?? "n/a"}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-3 text-sm">
                      <div className="rounded-[1rem] border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Hours completed</p>
                        <p className="mt-1 font-semibold text-slate-900">{volunteer?.completed_hours ?? 0}</p>
                      </div>
                      <div className="rounded-[1rem] border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Events completed</p>
                        <p className="mt-1 font-semibold text-slate-900">{volunteer?.completed_events ?? 0}</p>
                      </div>
                      <div className="rounded-[1rem] border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Overall rating</p>
                        <p className="mt-1 font-semibold text-slate-900">{(volunteer?.rating ?? 0).toFixed(1) + " / 5.0"}</p>
                      </div>
                    </div>

                    {volunteer?.skills?.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {volunteer.skills.map((skill) => (
                          <span key={skill} className="stamp-pill rounded-full px-2 py-1 text-xs text-slate-800">
                            {skill}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {!isCompleted ? (
                      <AttendanceUpdateForm
                        eventId={event.id}
                        applicationId={application.id}
                        initialAttended={Boolean(application.attended)}
                        initialRating={application.org_rating}
                      />
                    ) : (
                      <p className="mt-4 rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                        This event has ended. Attendance is locked.
                      </p>
                    )}
                  </article>
                );
              })
            ) : (
              <p className="text-sm text-slate-600">No accepted volunteers yet.</p>
            )}
          </div>
        </section>

        <section className="paper-panel rounded-[1.75rem] p-5 sm:p-6">
          <p className="kicker">Applications</p>
          <h2 className="display-font mt-1 text-2xl font-semibold text-slate-900">Applied volunteers</h2>
          <p className="mt-2 text-sm text-slate-600">Review pending volunteers and accept or decline them here.</p>
          <p className="mt-1 text-sm text-slate-600">Required skills and volunteer coverage: review which required skills this event asks for and which applicants currently match them.</p>

          <div className="mt-4 rounded-[1.15rem] border border-slate-200 bg-white/80 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Event required skills</p>
            {requiredSkills.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {requiredSkills.map((skill: string) => (
                  <span key={`${event.id}-${skill}`} className="stamp-pill rounded-full px-2 py-1 text-xs text-slate-800">
                    {getSkillLabel(skill)}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-sm text-slate-600">No required skills set for this event.</p>
            )}
          </div>

          <div className="mt-4 space-y-3">
            {appliedApplications.length > 0 ? (
              appliedApplications.map((application) => {
                const volunteer = volunteersById.get(application.volunteer_id);
                const displayName = getVolunteerDisplayName(application.volunteer_id, volunteer?.name);
                const volunteerSkills = volunteer?.skills ?? [];
                const matchedSkills = requiredSkills.filter((requiredSkill: string) => volunteerSkills.includes(requiredSkill));
                const missingSkills = requiredSkills.filter((requiredSkill: string) => !volunteerSkills.includes(requiredSkill));

                return (
                  <article key={application.id} className="rounded-[1.35rem] border border-slate-200 bg-white/80 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="display-font text-xl font-semibold text-slate-900">{displayName}</p>
                        <p className="mt-1 text-sm text-slate-600">{volunteer?.contact_email || "No email"}</p>
                        <p className="mt-1 text-xs text-slate-500">Application status: {application.status}</p>
                        {volunteer?.contact_email ? (
                          <a
                            href={`mailto:${volunteer.contact_email}`}
                            className="mt-1 inline-flex text-xs font-semibold text-slate-900 underline decoration-2 underline-offset-4"
                          >
                            Email volunteer
                          </a>
                        ) : null}
                      </div>

                      <div className="grid gap-2 sm:grid-cols-3 text-sm">
                        <div className="rounded-[1rem] border border-slate-200 bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Hours completed</p>
                          <p className="mt-1 font-semibold text-slate-900">{volunteer?.completed_hours ?? 0}</p>
                        </div>
                        <div className="rounded-[1rem] border border-slate-200 bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Events completed</p>
                          <p className="mt-1 font-semibold text-slate-900">{volunteer?.completed_events ?? 0}</p>
                        </div>
                        <div className="rounded-[1rem] border border-slate-200 bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Overall rating</p>
                          <p className="mt-1 font-semibold text-slate-900">{volunteer?.rating ?? 0}</p>
                        </div>
                      </div>

                      <div className="w-full rounded-[1rem] border border-slate-200 bg-slate-50 p-3 text-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Required skills and volunteer coverage</p>
                        <div className="mt-2">
                          <p className="text-xs font-semibold text-slate-700">Applicant skills</p>
                          {volunteerSkills.length > 0 ? (
                            <div className="mt-1 flex flex-wrap gap-2">
                              {volunteerSkills.map((skill: string) => (
                                <span key={`${application.id}-skill-${skill}`} className="stamp-pill rounded-full px-2 py-1 text-xs text-slate-800">
                                  {getSkillLabel(skill)}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-1 text-xs text-slate-600">No skills listed.</p>
                          )}
                        </div>
                        <p className="mt-2 text-xs text-slate-700">
                          Has required: {matchedSkills.length > 0 ? matchedSkills.map(getSkillLabel).join(", ") : "None"}
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                          Missing required: {missingSkills.length > 0 ? missingSkills.map(getSkillLabel).join(", ") : "None"}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <form action={acceptApplication}>
                          <input type="hidden" name="applicationId" value={application.id} />
                          <button type="submit" className="rounded-full primary-action px-3 py-2 text-sm font-semibold">
                            Accept
                          </button>
                        </form>
                        <form action={declineApplication}>
                          <input type="hidden" name="applicationId" value={application.id} />
                          <button type="submit" className="rounded-full secondary-action px-3 py-2 text-sm font-semibold">
                            Decline
                          </button>
                        </form>
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <p className="text-sm text-slate-600">No pending applications right now.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
