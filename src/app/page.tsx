import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { applyToEvent, requestSkillVerification, signOut, updateProfileName } from "./actions";
import { AUTO_EARNED_STAMPS, STAMP_LABELS, VERIFIED_STAMPS } from "@/lib/stamps";

type EventCard = {
  id: string;
  title: string;
  description: string | null;
  hours_given: number;
  max_volunteers: number;
  organizations: { name: string } | null;
  event_applications: { id: string }[];
};

type VolunteerProfile = {
  name: string;
  skills: string[] | null;
  completed_hours: number;
  completed_events: number;
  contact_email: string | null;
};

type VolunteerApplication = {
  id: string;
  event_id: string;
  status: string;
  events: {
    title: string;
  }[] | null;
};

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
        .select("id, event_id, status, events(title)")
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
      event_applications ( id )
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

          <div className="flex shrink-0 gap-2">
            <details className="relative">
              <summary className="cursor-pointer list-none rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900">
                Current volunteering events
              </summary>
              <div className="absolute right-0 top-full z-10 mt-2 w-72 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                {user ? (
                  myApplications.length > 0 ? (
                    <div className="space-y-2">
                      {myApplications.map((application) => (
                        <div key={application.id} className="rounded-md border border-gray-200 px-2 py-1 text-xs">
                          <p className="font-medium text-gray-800">{application.events?.[0]?.title || "Event"}</p>
                          <p className="text-gray-600">Status: {application.status}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No applications yet.</p>
                  )
                ) : (
                  <Link
                    href="/login"
                    className="inline-flex rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
                  >
                    Go to login
                  </Link>
                )}
              </div>
            </details>

            <details className="relative">
              <summary className="cursor-pointer list-none rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900">
                Profile
              </summary>
            <div className="absolute right-0 top-full z-10 mt-2 w-72 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              {user && profile ? (
                <>
                  <p className="text-sm font-semibold text-gray-900">{profile.name}</p>
                  <p className="mt-1 text-xs text-gray-500">{profile.contact_email || user.email}</p>

                  <form action={updateProfileName} className="mt-4 space-y-2">
                    <label className="block text-xs uppercase tracking-wide text-gray-500" htmlFor="profile-name">
                      Full name
                    </label>
                    <input
                      id="profile-name"
                      name="name"
                      defaultValue={profile.name}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                    <button
                      type="submit"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900"
                    >
                      Save name
                    </button>
                  </form>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">Hours</p>
                      <p className="font-semibold text-gray-900">{profile.completed_hours}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">Events</p>
                      <p className="font-semibold text-gray-900">{profile.completed_events}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Skills</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {profile.skills && profile.skills.length > 0 ? (
                        profile.skills.map((skill) => (
                          <span key={skill} className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-800">
                            {skill}
                          </span>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No skills listed.</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Auto-earned</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {AUTO_EARNED_STAMPS.map((stamp) => (
                        <span key={stamp} className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-800">
                          {STAMP_LABELS[stamp]}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Request verified stamp</p>
                    <form action={requestSkillVerification} className="mt-2 space-y-2">
                      <select
                        name="stamp"
                        defaultValue={VERIFIED_STAMPS[0]}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      >
                        {VERIFIED_STAMPS.map((stamp) => (
                          <option key={stamp} value={stamp}>
                            {STAMP_LABELS[stamp]}
                          </option>
                        ))}
                      </select>
                      <input
                        name="proof"
                        type="file"
                        accept="image/*,application/pdf"
                        className="block w-full text-xs text-gray-600"
                      />
                      <p className="text-xs text-gray-500">Attach a certificate or photo for verification.</p>
                      <button
                        type="submit"
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900"
                      >
                        Submit proof
                      </button>
                    </form>
                  </div>

                  <form action={signOut} className="mt-4">
                    <button
                      type="submit"
                      className="w-full rounded-md bg-black px-3 py-2 text-sm font-medium text-white"
                    >
                      Log out
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-gray-900">Not signed in</p>
                  <p className="mt-1 text-sm text-gray-600">Sign in to see your profile and skills.</p>
                  <Link
                    href="/login"
                    className="mt-4 inline-flex rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
                  >
                    Go to login
                  </Link>
                </>
              )}
            </div>
            </details>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {events?.length === 0 ? (
            <p className="text-gray-500">No events found.</p>
          ) : (
            (events as EventCard[]).map((event) => {
              const spotsTaken = event.event_applications?.length || 0;
              const spotsLeft = event.max_volunteers - spotsTaken;
              const isFull = spotsLeft <= 0;
              const submitAction = applyToEvent.bind(null, event.id);
              const myStatus = applicationStatusByEvent.get(event.id);
              const canApply = user && !myStatus;
              const buttonLabel = myStatus ? myStatus : isFull ? "Join Waitlist" : "Apply Now";

              return (
                <div key={event.id} className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm relative overflow-hidden">
                  {isFull && (
                    <div className="absolute top-0 left-0 right-0 bg-red-100 text-red-800 text-xs font-bold text-center py-1">
                      EVENT FULL
                    </div>
                  )}

                  <div className={`mt-2 ${isFull ? "opacity-60" : ""}`}>
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
                      {event.organizations?.name || "Independent"}
                    </p>

                    <div className="flex justify-between items-start mb-2">
                      <h2 className="text-xl font-bold text-gray-900 leading-tight">
                        {event.title}
                      </h2>
                      <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-md whitespace-nowrap">
                        {event.hours_given} hrs
                      </span>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {event.description}
                    </p>

                    <div className="flex justify-between items-end border-t border-gray-100 pt-4 mt-4">
                      <div className="text-sm font-medium text-gray-500">
                        Volunteers: <span className={isFull ? "text-red-500 font-bold" : "text-gray-900"}>
                          {spotsTaken} / {event.max_volunteers}
                        </span>
                      </div>

                      {user ? (
                        <form>
                          <button
                            formAction={submitAction}
                            disabled={!canApply}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                              canApply
                                ? "bg-black text-white hover:bg-gray-800"
                                : "bg-gray-100 text-gray-500 cursor-not-allowed"
                            }`}
                          >
                            {buttonLabel}
                          </button>
                        </form>
                      ) : (
                        <Link
                          href="/login"
                          className="px-4 py-2 rounded-lg text-sm font-bold bg-black text-white hover:bg-gray-800"
                        >
                          Log in to apply
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}