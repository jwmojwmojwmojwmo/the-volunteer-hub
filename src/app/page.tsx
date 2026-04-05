import { createClient } from "@/lib/supabase/server";
import type { EventCard, VolunteerApplication, VolunteerProfile } from "@/types/volunteer";
import VolunteerHeaderMenus from "./volunteer/_components/VolunteerHeaderMenus";
import VolunteerEventGrid from "./volunteer/_components/VolunteerEventGrid";

export default async function Home() {
  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;

  const { data: profileData } = user
    ? await supabase
        .from("volunteers")
        .select("name, skills, completed_hours, completed_events, contact_email")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };
  const profile: VolunteerProfile | null = profileData;

  const { data: applicationsData } = user
    ? await supabase
        .from("event_applications")
        .select("id, event_id, status, applied_at, events(title)")
        .eq("volunteer_id", user.id)
        .order("applied_at", { ascending: false })
    : { data: [] };
  const myApplications = (applicationsData ?? []) as VolunteerApplication[];
  const applicationStatusByEvent = new Map(myApplications.map((application) => [application.event_id, application.status]));

  const { data: events, error } = await supabase
    .from("events")
    .select(`
      *,
      organizations ( name ),
      event_applications ( id, status )
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

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Live Volunteer Map</h1>
            <p className="mt-1 text-sm text-gray-600">Browse events and check your profile from here.</p>
          </div>

          <VolunteerHeaderMenus
            isSignedIn={Boolean(user)}
            userEmail={user?.email}
            profile={profile}
            myApplications={myApplications}
          />
        </div>

        <VolunteerEventGrid
          events={(events ?? []) as EventCard[]}
          isSignedIn={Boolean(user)}
          applicationStatusByEvent={applicationStatusByEvent}
        />
      </div>
    </main>
  );
}