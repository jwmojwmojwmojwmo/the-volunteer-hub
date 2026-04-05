import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { applyToEvent } from "@/app/volunteer/actions";
import { APPLICATION_STATUSES, getApplicationStatusLabel } from "@/lib/application-status";
import { STAMP_LABELS } from "@/lib/stamps";

type VolunteerEventDetailsPageProps = {
  params: Promise<{
    eventId: string;
  }>;
};

type EventDetailsRow = {
  id: string;
  title: string;
  description: string | null;
  address: string | null;
  status: string;
  hours_given: number;
  max_volunteers: number;
  created_at: string;
  skills_needed: string[] | null;
  organizations: { id: string; name: string } | null;
  event_applications: { id: string; status: string }[] | null;
  event_tags: { tags?: { name: string | null } | null }[] | null;
};

export default async function VolunteerEventDetailsPage({ params }: VolunteerEventDetailsPageProps) {
  const { eventId } = await params;
  const supabase = await createClient();

  const [{ data: authData }, { data: eventData }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("events")
      .select(`
        id,
        title,
        description,
        address,
        status,
        hours_given,
        max_volunteers,
        created_at,
        skills_needed,
        organizations ( id, name ),
        event_applications ( id, status ),
        event_tags ( tags ( name ) )
      `)
      .eq("id", eventId)
      .maybeSingle()
  ]);

  const event = eventData as EventDetailsRow | null;
  const user = authData.user;

  if (!event) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-3xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900">Event not found</h1>
          <p className="mt-2 text-sm text-gray-600">This event might have been removed.</p>
          <Link href="/" className="mt-4 inline-flex rounded-md bg-black px-4 py-2 text-sm font-medium text-white">
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  const tags = (event.event_tags ?? [])
    .map((eventTag) => eventTag.tags?.name)
    .filter((tag): tag is string => Boolean(tag));

  const skillsNeeded = event.skills_needed ?? [];
  const acceptedCount = (event.event_applications ?? []).filter(
    (application) => application.status === APPLICATION_STATUSES.ACCEPTED
  ).length;

  const spotsLeft = event.max_volunteers - acceptedCount;
  const isFull = spotsLeft <= 0;

  const myStatus = user
    ? (
        await supabase
          .from("event_applications")
          .select("status")
          .eq("event_id", event.id)
          .eq("volunteer_id", user.id)
          .maybeSingle()
      ).data?.status
    : null;

  const canApply =
    Boolean(user) &&
    (!myStatus || myStatus === APPLICATION_STATUSES.WITHDRAWN) &&
    event.status.toLowerCase() === "recruiting";
  const submitAction = applyToEvent.bind(null, event.id);
  const applyButtonLabel = myStatus === APPLICATION_STATUSES.WITHDRAWN
    ? "Apply again"
    : myStatus
    ? getApplicationStatusLabel(myStatus)
    : isFull
      ? "Join waitlist"
      : "Apply now";

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                {event.organizations ? (
                  <Link href={`/organizations/${event.organizations.id}`} className="underline hover:no-underline">
                    {event.organizations.name}
                  </Link>
                ) : (
                  "Independent"
                )}
              </p>
              <h1 className="mt-1 text-3xl font-bold text-gray-900">{event.title}</h1>
              <p className="mt-2 text-sm text-gray-600">Status: {event.status}</p>
              <p className="mt-1 text-sm text-gray-600">Address: {event.address || "Not specified"}</p>
              <p className="mt-1 text-sm text-gray-600">Created: {new Date(event.created_at).toLocaleDateString()}</p>
            </div>

            <div className="rounded-lg bg-blue-50 px-4 py-3 text-right">
              <p className="text-xs uppercase tracking-wide text-blue-700">Hours</p>
              <p className="text-xl font-semibold text-blue-900">{event.hours_given}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">Capacity</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {acceptedCount} / {event.max_volunteers}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">Open spots</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">{Math.max(spotsLeft, 0)}</p>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-gray-200 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">Full description</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
              {event.description || "No description provided for this event."}
            </p>
          </div>

          <div className="mt-4 rounded-lg border border-gray-200 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">Tags</h2>
            {tags.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-600">No tags were added to this event.</p>
            )}
          </div>

          <div className="mt-4 rounded-lg border border-gray-200 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">Skills needed</h2>
            {skillsNeeded.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {skillsNeeded.map((skill) => (
                  <span key={skill} className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                    {STAMP_LABELS[skill as keyof typeof STAMP_LABELS] || skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-600">No required skills listed.</p>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {user ? (
              <form>
                <button
                  formAction={submitAction}
                  disabled={!canApply}
                  className={`rounded-md px-4 py-2 text-sm font-medium ${
                    canApply
                      ? "bg-black text-white hover:bg-gray-800"
                      : "cursor-not-allowed bg-gray-100 text-gray-500"
                  }`}
                >
                  {applyButtonLabel}
                </button>
              </form>
            ) : (
              <Link href="/login" className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
                Log in to apply
              </Link>
            )}

            <Link href="/" className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900">
              Back to dashboard
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
