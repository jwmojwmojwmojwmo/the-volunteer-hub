import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { EventCard, VolunteerApplication, VolunteerProfile } from "@/types/volunteer";
import { buildEventMetaById, normalizeVolunteerApplications } from "@/lib/volunteer-application-utils";
import VolunteerHeaderMenus from "@/app/volunteer/_components/VolunteerHeaderMenus";
import ReloadButton from "@/components/ReloadButton";
import VolunteerEventBrowser from "./volunteer/_components/VolunteerEventBrowser";

type EventQueryRow = Omit<EventCard, "tags"> & {
  event_tags?: { tags?: { name: string | null } | null }[] | null;
};

function normalizeStatus(value: unknown) {
  return String(value ?? "").toLowerCase();
}

export default async function Home() {
  const supabase = await createClient();

  const renderLanding = (sessionNotice?: string) => (
    <main className="min-h-screen px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
      <div className="mx-auto max-w-[1700px] space-y-5">
        <header className="paper-panel relative z-40 rounded-[1.6rem] px-4 py-4 sm:px-5 sm:py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="kicker">Volunteer Hub</p>
              <h1 className="display-font mt-1 break-words text-3xl font-semibold text-slate-900 sm:text-4xl">Find the right opportunities</h1>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <Link href="/login" className="primary-action rounded-full px-4 py-2 text-sm font-semibold">Login or Sign up</Link>
            </div>
          </div>
        </header>

        {sessionNotice ? (
          <div className="rounded-[1.2rem] border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
            {sessionNotice}
          </div>
        ) : null}

        <section className="paper-panel rounded-[1.85rem] px-5 py-6 sm:px-8 sm:py-8">
          <article className="max-w-4xl">
            <p className="kicker">For volunteers</p>
            <h2 className="display-font mt-2 text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
              Find nearby shifts, apply once, and track every hour in one verified dashboard.
            </h2>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-700 sm:text-base">
              Discover verified opportunities on the map, submit one clear application, and keep your profile focused on what matters: accepted events, earned hours, verified certifications, and progression milestones.
            </p>

            <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-800 sm:text-base">
              <li className="flex gap-3">
                <span aria-hidden="true" className="mt-[0.58rem] h-2 w-2 shrink-0 rounded-full bg-[#0e5c93]" />
                <span>Live map with real opportunities from verified hosts, including hours, perks, and required skills.</span>
              </li>
              <li className="flex gap-3">
                <span aria-hidden="true" className="mt-[0.58rem] h-2 w-2 shrink-0 rounded-full bg-[#0e5c93]" />
                <span>One-tap apply flow when signed in, with all submissions visible in a dedicated My Applications view.</span>
              </li>
              <li className="flex gap-3">
                <span aria-hidden="true" className="mt-[0.58rem] h-2 w-2 shrink-0 rounded-full bg-[#0e5c93]" />
                <span>Profile combines self-declared skills, admin-verified certifications, and a milestone progression path.</span>
              </li>
            </ul>

            <Link href="/login" className="mt-7 inline-flex rounded-full primary-action px-6 py-3 text-base font-semibold">
              Start volunteering
            </Link>
            <p className="mt-2 text-xs text-slate-600">Create a volunteer account and jump straight into nearby opportunities.</p>
          </article>

          <div className="my-8 h-px w-full bg-slate-400/80" />

          <article className="max-w-4xl">
            <p className="kicker">For organizations</p>
            <h2 className="display-font mt-2 text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
              Post shifts, review applicants, and record attendance from one operations desk.
            </h2>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-700 sm:text-base">
              The host dashboard is built for day-to-day execution: publish events quickly, evaluate applicants clearly, and update attendance with confidence while volunteers see only what they need.
            </p>

            <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-800 sm:text-base">
              <li className="flex gap-3">
                <span aria-hidden="true" className="mt-[0.58rem] h-2 w-2 shrink-0 rounded-full bg-[#0e5c93]" />
                <span>Publish opportunities with location, shift hours, capacity limits, tags, and required certifications.</span>
              </li>
              <li className="flex gap-3">
                <span aria-hidden="true" className="mt-[0.58rem] h-2 w-2 shrink-0 rounded-full bg-[#0e5c93]" />
                <span>Accept, waitlist, or decline applicants, then mark attendance after each event to keep records accurate.</span>
              </li>
              <li className="flex gap-3">
                <span aria-hidden="true" className="mt-[0.58rem] h-2 w-2 shrink-0 rounded-full bg-[#0e5c93]" />
                <span>Maintain a transparent organization profile that supports trust with volunteers and partners.</span>
              </li>
            </ul>

            <Link href="/org/login" className="mt-7 inline-flex rounded-full primary-action px-6 py-3 text-base font-semibold">
              Start organizing events
            </Link>
            <p className="mt-2 text-xs text-slate-600">Create an organization account to launch and manage events in minutes.</p>
          </article>
        </section>

      </div>
    </main>
  );

  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  const isAnonymousUser = Boolean(user && "is_anonymous" in user && user.is_anonymous);

  if (!user || isAnonymousUser) {
    return renderLanding();
  }

  const { data: profileData } = await supabase
    .from("volunteers")
    .select("name, skills, completed_hours, completed_events, contact_email")
    .eq("id", user.id)
    .maybeSingle();
  const profile: VolunteerProfile | null = profileData;

  if (!profile) {
    return renderLanding("This session is not linked to a volunteer account yet. Please sign in with a volunteer account or create one.");
  }

  const { data: eventsData, error } = await supabase
    .from("events")
    .select(`
      *,
      organizations ( id, name ),
      event_applications ( id, status ),
      event_tags ( tags ( name ) )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching events:", error);
    return (
      <div className="p-8 text-red-600 bg-red-50">
        Failed to load events. <pre>{JSON.stringify(error, null, 2)}</pre>
      </div>
    );
  }

  const rawEvents = (eventsData ?? []) as EventQueryRow[];
  const formattedEvents: EventCard[] = rawEvents.map((event) => {
    const eventTags = Array.isArray(event.event_tags) ? event.event_tags : [];
    const tags = eventTags
      .map((eventTag) => eventTag.tags?.name)
      .filter((tag): tag is string => Boolean(tag));

    return {
      ...event,
      status: String(event.status ?? "unknown"),
      tags
    };
  });

  const eventMetaById = buildEventMetaById(formattedEvents);

  const { data: applicationsData } = await supabase
    .from("event_applications")
    .select("id, event_id, status, attended, applied_at, events(title, status, hours_given)")
    .eq("volunteer_id", user.id)
    .order("applied_at", { ascending: false });
  const myApplications = normalizeVolunteerApplications((applicationsData ?? []) as VolunteerApplication[], eventMetaById);
  const applicationStatusByEvent = new Map(myApplications.map((application) => [application.event_id, application.status]));

  return (
    <main className="h-[100dvh] overflow-hidden px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
      <div className="mx-auto flex h-full max-w-[1700px] min-h-0 flex-col gap-4 overflow-hidden">
        <div className="mx-auto w-full max-w-6xl">
          <header className="paper-panel relative z-40 rounded-[1.6rem] px-4 py-4 sm:px-5 sm:py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <VolunteerHeaderMenus isSignedIn={Boolean(user)} />
              <ReloadButton label="Refresh" />
            </div>
          </header>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          <VolunteerEventBrowser
            events={formattedEvents.filter((event) => normalizeStatus(event.status) !== "completed")}
            isSignedIn={Boolean(user)}
            profile={profile}
            applicationStatusByEvent={applicationStatusByEvent}
          />
        </div>
      </div>
    </main>
  );
}