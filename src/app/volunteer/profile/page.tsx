import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/volunteer/actions";
import VolunteerHeaderMenus from "@/app/volunteer/_components/VolunteerHeaderMenus";
import ReloadButton from "@/components/ReloadButton";
import { SELF_DECLARED_STAMPS, STAMP_LABELS, VERIFIED_STAMPS } from "@/lib/stamps";
import { APPLICATION_STATUSES } from "@/lib/application-status";

type VolunteerProfileRow = {
  id: string;
  name: string;
  contact_email: string | null;
  completed_hours: number;
  completed_events: number;
  rating: number;
  skills: string[] | null;
};

type VolunteerApplicationStatusRow = {
  status: string;
  events: { status: string }[] | { status: string } | null;
};

function getRelatedEventStatus(application: VolunteerApplicationStatusRow) {
  const relation = application.events;

  if (!relation) {
    return null;
  }

  if (Array.isArray(relation)) {
    return relation[0]?.status?.toLowerCase() ?? null;
  }

  return relation.status?.toLowerCase() ?? null;
}

export default async function VolunteerProfilePage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;

  if (!user) {
    redirect("/login");
  }

  const [{ data: volunteer }, { data: applicationsData }] = await Promise.all([
    supabase
      .from("volunteers")
      .select("id, name, contact_email, completed_hours, completed_events, rating, skills")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("event_applications")
      .select("status, events(status)")
      .eq("volunteer_id", user.id)
  ]);

  const profile = volunteer as VolunteerProfileRow | null;
  const applicationRows = (applicationsData ?? []) as VolunteerApplicationStatusRow[];

  if (!profile) {
    return (
      <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <section className="paper-panel rounded-[1.6rem] px-4 py-4 sm:px-5 sm:py-5">
            <VolunteerHeaderMenus isSignedIn={Boolean(user)} />
          </section>

          <section className="paper-panel-strong rounded-[1.75rem] p-6">
            <p className="kicker">Volunteer profile</p>
            <h1 className="display-font mt-2 text-3xl font-semibold text-slate-900">Profile not found</h1>
            <p className="mt-2 text-sm text-slate-600">Your volunteer profile is not available yet.</p>
          </section>
        </div>
      </main>
    );
  }

  const allSkills = profile.skills ?? [];
  const verifiedSkills = allSkills.filter((skill) => VERIFIED_STAMPS.includes(skill as (typeof VERIFIED_STAMPS)[number]));
  const declaredSkills = allSkills.filter((skill) => SELF_DECLARED_STAMPS.includes(skill as (typeof SELF_DECLARED_STAMPS)[number]));
  const profileInitials = profile.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "V";

  let appliedCount = 0;
  let acceptedCount = 0;
  let rejectedCount = 0;
  let pastCount = 0;

  for (const application of applicationRows) {
    const eventStatus = getRelatedEventStatus(application);

    if (eventStatus === "completed") {
      pastCount += 1;
      continue;
    }

    if (application.status === APPLICATION_STATUSES.ACCEPTED) {
      acceptedCount += 1;
      continue;
    }

    if (application.status === APPLICATION_STATUSES.DECLINED || application.status === APPLICATION_STATUSES.WITHDRAWN) {
      rejectedCount += 1;
      continue;
    }

    appliedCount += 1;
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="paper-panel rounded-[1.6rem] px-4 py-4 sm:px-5 sm:py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <VolunteerHeaderMenus isSignedIn={Boolean(user)} />
            <ReloadButton label="Refresh" />
          </div>
        </section>

        <section className="paper-panel-strong rounded-[2rem] p-5 sm:p-7">
          <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
            <div className="flex h-52 items-center justify-center rounded-[1.2rem] border border-slate-300 bg-slate-100" aria-label="Default profile picture">
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-slate-500 bg-white text-2xl font-bold text-slate-700">
                {profileInitials}
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="kicker">Volunteer profile</p>
                  <h1 className="display-font mt-1 text-4xl font-semibold text-slate-900 sm:text-5xl">{profile.name}</h1>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link href="/volunteer/profile/edit" className="primary-action rounded-full px-4 py-2 text-sm font-semibold">
                    Edit
                  </Link>
                  <Link href="/volunteer/progression" className="secondary-action rounded-full px-4 py-2 text-sm font-semibold">
                    Progression board
                  </Link>
                  <form action={signOut}>
                    <button type="submit" className="secondary-action rounded-full px-4 py-2 text-sm font-semibold">
                      Log out
                    </button>
                  </form>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-[1rem] border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Email</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 break-words">{profile.contact_email || user.email || "No email set"}</p>
                </div>
                <div className="rounded-[1rem] border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Hours</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{profile.completed_hours}</p>
                </div>
                <div className="rounded-[1rem] border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Rating</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{profile.rating.toFixed(1)} stars</p>
                </div>
                <div className="rounded-[1rem] border border-slate-200 bg-white p-3 sm:col-span-2 lg:col-span-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Skills</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {declaredSkills.length > 0
                      ? declaredSkills.map((skill) => STAMP_LABELS[skill as keyof typeof STAMP_LABELS] || skill).join(", ")
                      : "None yet"}
                  </p>
                </div>
                <div className="rounded-[1rem] border border-slate-200 bg-white p-3 sm:col-span-2 lg:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Certifications</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {verifiedSkills.length > 0
                      ? verifiedSkills.map((skill) => STAMP_LABELS[skill as keyof typeof STAMP_LABELS] || skill).join(", ")
                      : "None yet"}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-[1rem] border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Applications</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Link href="/volunteer/applications?tab=applied" className="secondary-action rounded-full px-4 py-2 text-sm font-semibold">
                    Applied ({appliedCount})
                  </Link>
                  <Link href="/volunteer/applications?tab=accepted" className="secondary-action rounded-full px-4 py-2 text-sm font-semibold">
                    Accepted ({acceptedCount})
                  </Link>
                  <Link href="/volunteer/applications?tab=rejected" className="secondary-action rounded-full px-4 py-2 text-sm font-semibold">
                    Rejected ({rejectedCount})
                  </Link>
                  <Link href="/volunteer/applications?tab=past" className="secondary-action rounded-full px-4 py-2 text-sm font-semibold">
                    Past ({pastCount})
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
