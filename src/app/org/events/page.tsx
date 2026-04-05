import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import OrgHeaderNav from "@/app/org/_components/OrgHeaderNav";
import ReloadButton from "@/components/ReloadButton";
import type { OrganizationEvent } from "@/types/organization";
import OrgEventsTabs from "./OrgEventsTabs";

type OrgEventRow = OrganizationEvent & {
  event_applications: { id: string; status: string }[];
};

export default async function OrganizationEventsPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;

  if (!user) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-8">
        <div className="paper-panel rounded-[1.75rem] p-6">
          <p className="kicker">Organization access</p>
          <h1 className="display-font mt-2 text-3xl font-semibold text-slate-900">Sign in to view events</h1>
          <p className="mt-2 text-sm text-slate-600">You need an organization account to open this page.</p>
          <Link href="/org/login" className="mt-4 inline-flex rounded-full primary-action px-4 py-2 text-sm font-semibold">
            Go to organization login
          </Link>
        </div>
      </main>
    );
  }

  const { data: eventsData } = await supabase
    .from("events")
    .select("id, title, address, status, created_at, max_volunteers, skills_needed, event_applications(id, status)")
    .eq("org_id", user.id)
    .order("created_at", { ascending: false });

  const events = (eventsData ?? []) as OrgEventRow[];
  const presentEvents = events.filter((event) => {
    const status = event.status.toLowerCase();
    return status === "recruiting" || status === "ongoing";
  });
  const pastEvents = events.filter((event) => event.status.toLowerCase() === "completed");

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="paper-panel rounded-[1.6rem] px-4 py-4 sm:px-5 sm:py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <OrgHeaderNav isSignedIn={Boolean(user)} />
            <ReloadButton label="Refresh events" />
          </div>
        </section>

        <OrgEventsTabs presentEvents={presentEvents} pastEvents={pastEvents} />
      </div>
    </main>
  );
}
