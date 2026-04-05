import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  AUTO_EARNED_STAMPS,
  AUTO_EARNED_STAMP_REQUIREMENTS,
  SELF_DECLARED_STAMPS,
  STAMP_LABELS,
  VERIFIED_STAMPS
} from "@/lib/stamps";
import { requestSkillVerification, signOut, updateSelfDeclaredSkills } from "@/app/volunteer/actions";

type VolunteerProfileRow = {
  id: string;
  name: string;
  contact_email: string | null;
  completed_hours: number;
  completed_events: number;
  skills: string[] | null;
};

function getAutoEarnedProgress(stamp: (typeof AUTO_EARNED_STAMPS)[number], profile: VolunteerProfileRow) {
  const requirement = AUTO_EARNED_STAMP_REQUIREMENTS[stamp];
  const currentValue = requirement.metric === "hours" ? profile.completed_hours : profile.completed_events;
  const progress = Math.min(100, Math.round((currentValue / requirement.target) * 100));
  const isUnlocked = currentValue >= requirement.target;

  return {
    requirement,
    currentValue,
    progress,
    isUnlocked
  };
}

function getNextMilestoneByMetric(metric: "hours" | "events", profile: VolunteerProfileRow) {
  const currentValue = metric === "hours" ? profile.completed_hours : profile.completed_events;
  const nextStamp = AUTO_EARNED_STAMPS.find((stamp) => {
    const requirement = AUTO_EARNED_STAMP_REQUIREMENTS[stamp];
    return requirement.metric === metric && requirement.target > currentValue;
  });

  if (!nextStamp) {
    return null;
  }

  const requirement = AUTO_EARNED_STAMP_REQUIREMENTS[nextStamp];
  const progress = Math.min(100, Math.round((currentValue / requirement.target) * 100));

  return {
    stamp: nextStamp,
    currentValue,
    target: requirement.target,
    progress,
    remaining: Math.max(requirement.target - currentValue, 0),
    metric
  };
}

function getNextOverallMilestone(profile: VolunteerProfileRow) {
  const lockedMilestones = AUTO_EARNED_STAMPS
    .map((stamp) => {
      const requirement = AUTO_EARNED_STAMP_REQUIREMENTS[stamp];
      const currentValue = requirement.metric === "hours" ? profile.completed_hours : profile.completed_events;
      if (currentValue >= requirement.target) {
        return null;
      }

      return {
        stamp,
        metric: requirement.metric,
        target: requirement.target,
        currentValue,
        progress: currentValue / requirement.target
      };
    })
    .filter((item): item is { stamp: (typeof AUTO_EARNED_STAMPS)[number]; metric: "hours" | "events"; target: number; currentValue: number; progress: number } => Boolean(item))
    .sort((a, b) => b.progress - a.progress);

  return lockedMilestones[0] ?? null;
}

export default async function VolunteerProfilePage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;

  if (!user) {
    redirect("/login");
  }

  const { data: volunteer } = await supabase
    .from("volunteers")
    .select("id, name, contact_email, completed_hours, completed_events, skills")
    .eq("id", user.id)
    .maybeSingle();

  const profile = volunteer as VolunteerProfileRow | null;

  if (!profile) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-3xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900">Profile not found</h1>
          <p className="mt-2 text-sm text-gray-600">We could not load your volunteer profile yet.</p>
          <Link href="/" className="mt-4 inline-flex rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900">
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  const unlockedSkills = new Set(profile.skills ?? []);
  const nextHoursMilestone = getNextMilestoneByMetric("hours", profile);
  const nextEventsMilestone = getNextMilestoneByMetric("events", profile);
  const nextOverallMilestone = getNextOverallMilestone(profile);

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Volunteer progression board</h1>
              <p className="mt-1 text-sm text-gray-600">Track milestones, unlock specialized skills, and fine-tune your matchmaking basics.</p>
            </div>
            <div className="flex gap-2">
              <Link href="/" className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900">
                Back to dashboard
              </Link>
              <form action={signOut}>
                <button type="submit" className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white">
                  Log out
                </button>
              </form>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">Email</p>
              <p className="mt-1 text-sm font-medium text-gray-900">{profile.contact_email || user.email || "Not set"}</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">Completed hours</p>
              <p className="mt-1 text-xl font-semibold text-gray-900">{profile.completed_hours}</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">Completed events</p>
              <p className="mt-1 text-xl font-semibold text-gray-900">{profile.completed_events}</p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">The Grind (Auto-earned)</h2>
          <p className="mt-1 text-sm text-gray-600">Earn these milestones by consistently showing up and putting in hours.</p>

          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            <article className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 lg:col-span-1">
              <p className="text-xs uppercase tracking-wide text-indigo-700">Next milestone</p>
              {nextOverallMilestone ? (
                <>
                  <p className="mt-1 text-sm font-semibold text-indigo-900">{STAMP_LABELS[nextOverallMilestone.stamp]}</p>
                  <p className="mt-1 text-xs text-indigo-800">
                    {nextOverallMilestone.currentValue} / {nextOverallMilestone.target} {nextOverallMilestone.metric}
                  </p>
                  <div className="mt-2 h-2 rounded-full bg-indigo-200">
                    <div
                      className="h-2 rounded-full bg-indigo-600"
                      style={{ width: `${Math.min(100, Math.round(nextOverallMilestone.progress * 100))}%` }}
                    />
                  </div>
                </>
              ) : (
                <p className="mt-1 text-sm font-medium text-indigo-900">All auto-earned milestones unlocked.</p>
              )}

              <div className="mt-3 space-y-2 text-xs text-indigo-900">
                {nextHoursMilestone ? (
                  <p>Hours track: {nextHoursMilestone.currentValue}/{nextHoursMilestone.target} ({nextHoursMilestone.remaining} left)</p>
                ) : (
                  <p>Hours track: complete</p>
                )}
                {nextEventsMilestone ? (
                  <p>Events track: {nextEventsMilestone.currentValue}/{nextEventsMilestone.target} ({nextEventsMilestone.remaining} left)</p>
                ) : (
                  <p>Events track: complete</p>
                )}
              </div>
            </article>

            <div className="grid gap-2 sm:grid-cols-2 lg:col-span-2">
              {AUTO_EARNED_STAMPS.map((stamp) => {
                const { requirement, currentValue, progress, isUnlocked } = getAutoEarnedProgress(stamp, profile);

                return (
                  <article
                    key={stamp}
                    className={`rounded-lg border p-3 ${isUnlocked ? "border-emerald-300 bg-emerald-50" : "border-gray-200 bg-gray-50"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm font-semibold ${isUnlocked ? "text-emerald-900" : "text-gray-700"}`}>
                        {STAMP_LABELS[stamp]}
                      </p>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${isUnlocked ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-600"}`}>
                        {isUnlocked ? "Unlocked" : "Locked"}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-gray-600">
                      {requirement.metric === "hours" ? "Hours milestone" : "Events milestone"}
                    </p>
                    {!isUnlocked ? (
                      <>
                        <p className="mt-1 text-[11px] text-gray-700">
                          {Math.min(currentValue, requirement.target)} / {requirement.target}
                        </p>
                        <div className="mt-1 h-2 rounded-full bg-gray-200">
                          <div className="h-2 rounded-full bg-gray-500" style={{ width: `${progress}%` }} />
                        </div>
                      </>
                    ) : (
                      <p className="mt-1 text-[11px] font-medium text-emerald-700">Milestone complete</p>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">The Unlocks (Verified)</h2>
            <p className="mt-1 text-sm text-gray-600">Upload proof for certifications and specialized skills to unlock verified stamps.</p>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {VERIFIED_STAMPS.map((stamp) => {
              const isUnlocked = unlockedSkills.has(stamp);

              return (
                <article
                  key={stamp}
                  className={`rounded-lg border p-3 ${isUnlocked ? "border-blue-300 bg-blue-50" : "border-gray-200 bg-gray-50"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-semibold ${isUnlocked ? "text-blue-900" : "text-gray-700"}`}>{STAMP_LABELS[stamp]}</p>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${isUnlocked ? "bg-blue-100 text-blue-800" : "bg-gray-200 text-gray-600"}`}>
                      {isUnlocked ? "Verified" : "Locked"}
                    </span>
                  </div>
                </article>
              );
            })}
            </div>

            <form action={requestSkillVerification} className="mt-4 grid gap-2 rounded-lg border border-gray-200 p-3 sm:grid-cols-[1fr_1fr_auto]">
            <div>
              <label className="block text-xs uppercase tracking-wide text-gray-500" htmlFor="verified-stamp-select">
                Stamp to verify
              </label>
              <select
                id="verified-stamp-select"
                name="stamp"
                defaultValue={VERIFIED_STAMPS[0]}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                {VERIFIED_STAMPS.map((stamp) => (
                  <option key={stamp} value={stamp}>
                    {STAMP_LABELS[stamp]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-gray-500" htmlFor="verification-proof">
                Proof document
              </label>
              <input
                id="verification-proof"
                name="proof"
                type="file"
                accept="image/*,application/pdf"
                className="mt-1 block w-full text-sm text-gray-700"
              />
            </div>
            <div className="flex items-end">
              <button type="submit" className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900">
                Submit proof
              </button>
            </div>
            </form>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">The Basics (Self-declared)</h2>
            <p className="mt-1 text-sm text-gray-600">Set your starter badges to improve event matching.</p>

            <form action={updateSelfDeclaredSkills} className="mt-3 space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
              {SELF_DECLARED_STAMPS.map((stamp) => {
                const enabled = unlockedSkills.has(stamp);

                return (
                  <label
                    key={stamp}
                    className={`flex items-center gap-3 rounded-lg border p-3 text-sm ${enabled ? "border-indigo-300 bg-indigo-50" : "border-gray-200 bg-gray-50"}`}
                  >
                    <input
                      type="checkbox"
                      name="selfDeclaredSkills"
                      value={stamp}
                      defaultChecked={enabled}
                      className="rounded border-gray-300"
                    />
                    <span className="font-medium text-gray-800">{STAMP_LABELS[stamp]}</span>
                  </label>
                );
              })}
              </div>
              <button type="submit" className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900">
                Save self-declared skills
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
