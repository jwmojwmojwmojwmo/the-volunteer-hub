import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { EventCard, VolunteerApplication, VolunteerProfile } from "@/types/volunteer";
import { buildEventMetaById, normalizeVolunteerApplications } from "@/lib/volunteer-application-utils";
import ReloadButton from "@/components/ReloadButton";
import VolunteerHeaderMenus from "./volunteer/_components/VolunteerHeaderMenus";
import VolunteerEventBrowser from "./volunteer/_components/VolunteerEventBrowser";

type EventQueryRow = Omit<EventCard, "tags"> & {
  event_tags?: { tags?: { name: string | null } | null }[] | null;
};

export default async function Home() {
  const supabase = await createClient();

  const renderLanding = (sessionNotice?: string) => (
    <main className="min-h-screen px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
      <div className="mx-auto max-w-[1700px] space-y-5">
        <header className="paper-panel relative z-40 rounded-[1.6rem] px-4 py-4 sm:px-5 sm:py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="kicker">Volunteer atlas</p>
              <h1 className="display-font mt-1 break-words text-3xl font-semibold text-slate-900 sm:text-4xl">Choose your journey</h1>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <Link href="/" className="stamp-pill rounded-full px-4 py-2 text-sm font-semibold">Volunteer</Link>
              <Link href="/login" className="primary-action rounded-full px-4 py-2 text-sm font-semibold">Login or Sign up</Link>
            </div>
          </div>
        </header>

        {sessionNotice ? (
          <div className="rounded-[1.2rem] border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
            {sessionNotice}
          </div>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-2 xl:gap-6">
          <article className="paper-panel min-h-[28rem] rounded-[1.85rem] px-5 py-6 sm:px-8">
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="kicker">For volunteers</p>
              <h2 className="display-font mt-2 text-4xl font-semibold text-slate-900">Start volunteering</h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
                Explore opportunities on a live map, apply to events, and collect your progression stamps as you complete hours.
              </p>
              <Link href="/login" className="mt-8 rounded-full bg-emerald-700 px-6 py-3 text-base font-semibold text-white shadow-[0_18px_36px_rgba(4,120,87,0.22)] transition hover:-translate-y-0.5 hover:bg-emerald-800">
                Start Volunteering
              </Link>
            </div>
          </article>

          <article className="paper-panel min-h-[28rem] rounded-[1.85rem] px-5 py-6 sm:px-8">
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="kicker">For organizations</p>
              <h2 className="display-font mt-2 text-4xl font-semibold text-slate-900">Start organizing events</h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
                Create opportunities, review applications, track attendance, and build trusted volunteer relationships.
              </p>
              <Link href="/org/login" className="mt-8 rounded-full bg-[#0b5d66] px-6 py-3 text-base font-semibold text-white shadow-[0_18px_36px_rgba(8,68,76,0.22)] transition hover:-translate-y-0.5 hover:bg-[#08444c]">
                Start Organizing Events
              </Link>
            </div>
          </article>
        </section>

        <section id="discover" className="paper-panel rounded-[1.6rem] px-5 py-5 text-center sm:px-6">
          <p className="kicker">Scroll down</p>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            One platform for community helpers and the teams that need them.
          </p>
          <div className="mt-4 inline-flex rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-xs font-semibold tracking-[0.16em] text-slate-700">
            VOLUNTEER ATLAS 2026
          </div>
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
    const tags = (event.event_tags ?? [])
      .map((eventTag) => eventTag.tags?.name)
      .filter((tag): tag is string => Boolean(tag));

    return {
      ...event,
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
        <header className="paper-panel relative z-40 rounded-[1.6rem] px-4 py-4 sm:px-5 sm:py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="kicker">Logged in as</p>
              <h1 className="display-font mt-1 break-words text-3xl font-semibold text-slate-900 sm:text-4xl">
                {profile.name}
              </h1>
              <p className="mt-1 break-words text-sm text-slate-600">{profile.contact_email || user.email || "Volunteer account"}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <ReloadButton label="Refresh atlas" />
              <VolunteerHeaderMenus
                isSignedIn={Boolean(user)}
                userEmail={user?.email}
                profile={profile}
                myApplications={myApplications}
              />
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden">
          <VolunteerEventBrowser
            events={formattedEvents.filter((event) => event.status.toLowerCase() !== "completed")}
            isSignedIn={Boolean(user)}
            profile={profile}
            applicationStatusByEvent={applicationStatusByEvent}
            userEmail={user.email || profile.contact_email || undefined}
          />
        </div>
      </div>
    </main>
  );
}