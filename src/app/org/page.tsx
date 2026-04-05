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
      <main className="p-8">
        <Link href="/org/login" className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white">
          Go to organization login
        </Link>
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
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Organization Dashboard</h1>
            <p className="mt-1 text-sm text-gray-600">{organization?.name || "Organization"}</p>
          </div>
          <div className="flex gap-2">
            <ReloadButton label="Reload dashboard" />
            <details className="relative">
              <summary className="cursor-pointer list-none rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900">
                Profile
              </summary>
              <div className="absolute right-0 top-full z-10 mt-2 w-72 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-gray-900">{organization?.name || "Organization"}</p>
                <p className="mt-1 text-xs text-gray-500">{organization?.contact_email || user.email}</p>

                <form action={updateOrganizationProfileName} className="mt-4 space-y-2">
                  <label className="block text-xs uppercase tracking-wide text-gray-500" htmlFor="org-profile-name">
                    Organization name
                  </label>
                  <input
                    id="org-profile-name"
                    name="name"
                    defaultValue={organization?.name || ""}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                  <button
                    type="submit"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900"
                  >
                    Save name
                  </button>
                </form>
              </div>
            </details>
            <Link href="/org/events/new" className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white">
              Create new event
            </Link>
            <form action={organizationSignOut}>
              <button type="submit" className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900">
                Log out
              </button>
            </form>
          </div>
        </div>

        <CurrentEventsList currentEvents={currentEvents} />

        <HostedEventsList allEvents={allEvents} />
      </div>
    </main>
  );
}
