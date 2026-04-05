import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { OrganizationEvent } from "@/types/organization";
import ReloadButton from "@/components/ReloadButton";
import { organizationSignOut, updateOrganizationProfileName } from "./actions";
import CurrentEventsList from "@/app/org/_components/CurrentEventsList";
import HostedEventsList from "@/app/org/_components/HostedEventsList";

export default async function OrganizationPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-8">
        <div className="paper-panel-strong rounded-[1.75rem] p-6 dark:border-slate-700 dark:bg-slate-950/88">
          <p className="kicker">Organization access</p>
          <h1 className="display-font mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-50">Sign in to manage events</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">You need an organization account to open this dashboard.</p>
          <Link href="/org/login" className="mt-5 inline-flex rounded-full primary-action px-4 py-2 text-sm font-semibold">
          Go to organization login
          </Link>
        </div>
      </main>
    );
  }

  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name, contact_email")
    .eq("id", user.id)
    .maybeSingle();

  const { data: eventsData } = await supabase
    .from("events")
    .select("id, title, address, status, created_at, max_volunteers, skills_needed, event_applications(id, status, volunteer_id, volunteers(name, skills))")
    .eq("org_id", user.id)
    .eq("hidden_from_org_dashboard", false)
    .order("created_at", { ascending: false });

  const allEvents = (eventsData ?? []) as OrganizationEvent[];
  const currentEvents = allEvents.filter((event) => {
    const status = event.status.toLowerCase();
    return status === "recruiting" || status === "ongoing";
  });

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="paper-panel-strong rounded-[2rem] p-5 sm:p-7 dark:border-slate-700 dark:bg-slate-950/88">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="kicker">Organization dashboard</p>
              <h1 className="display-font mt-2 text-4xl font-semibold text-slate-900 dark:text-slate-50 sm:text-5xl">{organization?.name || "Organization"}</h1>
              <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                Track active events, review volunteer applications, and keep the public-facing record tidy.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <ReloadButton label="Refresh dashboard" />
              <details className="relative">
                <summary className="stamp-pill cursor-pointer list-none rounded-[1rem] px-4 py-2.5 text-sm font-semibold shadow-[0_10px_20px_rgba(20,33,46,0.08)]">
                  Profile
                </summary>
                <div className="paper-panel-strong absolute right-0 top-full z-10 mt-3 w-80 rounded-[1.5rem] p-4 sm:p-5">
                  <p className="text-sm font-semibold text-slate-900">{organization?.name || "Organization"}</p>
                  <p className="mt-1 text-xs text-slate-600">{organization?.contact_email || user.email}</p>

                  <form action={updateOrganizationProfileName} className="mt-4 space-y-3">
                    <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500" htmlFor="org-profile-name">
                      Organization name
                    </label>
                    <input
                      id="org-profile-name"
                      name="name"
                      defaultValue={organization?.name || ""}
                      className="input-shell"
                    />
                    <button type="submit" className="primary-action w-full rounded-full px-4 py-2 text-sm font-semibold">
                      Save name
                    </button>
                  </form>
                </div>
              </details>
              <Link href="/org/events/new" className="inline-flex rounded-[1rem] primary-action px-4 py-2.5 text-sm font-semibold">
                Create new event
              </Link>
              <form action={organizationSignOut}>
                <button type="submit" className="secondary-action rounded-[1rem] px-4 py-2.5 text-sm font-semibold">
                  Log out
                </button>
              </form>
            </div>
          </div>
        </section>

        <CurrentEventsList currentEvents={currentEvents} />

        <HostedEventsList allEvents={allEvents} />
      </div>
    </main>
  );
}
