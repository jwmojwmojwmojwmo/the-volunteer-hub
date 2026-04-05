import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import {
  AUTO_EARNED_STAMPS,
  AUTO_EARNED_STAMP_REQUIREMENTS,
  SELF_DECLARED_STAMPS,
  STAMP_LABELS,
  VERIFIED_STAMPS
} from "@/lib/stamps";
import { requestSkillVerification, signOut, updateSelfDeclaredSkills } from "@/app/volunteer/actions";
import PassportFlipbook from "./_components/PassportFlipbook";

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

  const profileInitials = profile.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase())
    .join("") || "V";

  const verifiedUnlockedCount = VERIFIED_STAMPS.filter((stamp) => unlockedSkills.has(stamp)).length;
  const basicsUnlockedCount = SELF_DECLARED_STAMPS.filter((stamp) => unlockedSkills.has(stamp)).length;

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="paper-panel rounded-[2rem] p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="kicker">Passport record</p>
              <h1 className="display-font mt-1 text-4xl font-semibold text-slate-900 sm:text-5xl">Your volunteer stampbook</h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                This is your travel document for volunteering. Self-declared basics set the foundation, verified stamps are
                the official visas, and the final page summarizes your journey with clear milestone records.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link href="/" className="secondary-action rounded-full px-4 py-2 text-sm font-semibold">
                Back to dashboard
              </Link>
              <form action={signOut}>
                <button type="submit" className="primary-action rounded-full px-4 py-2 text-sm font-semibold">
                  Log out
                </button>
              </form>
            </div>
          </div>

          <div className="mt-6">
            <PassportFlipbook
              pageOne={(
                <div className="space-y-4">
                  <div className="rounded-[1.25rem] border border-slate-200 bg-white/90 p-4 sm:p-5">
                    <p className="kicker">Page 1 · Identity</p>
                    <div className="mt-3 flex flex-wrap items-start gap-4">
                      <div className="flex h-24 w-24 items-center justify-center rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(135deg,#0b5d66,#c45c2d)] text-3xl font-black text-white shadow-[0_18px_36px_rgba(20,33,46,0.22)]">
                        {profileInitials}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h2 className="display-font break-words text-3xl font-semibold text-slate-900">{profile.name}</h2>
                        <p className="mt-2 break-words text-sm text-slate-600">{profile.contact_email || user.email || "Not set"}</p>

                        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                          <span className="stamp-pill rounded-full px-3 py-1">{profile.completed_hours} hours</span>
                          <span className="stamp-pill rounded-full px-3 py-1">{profile.completed_events} events</span>
                          <span className="stamp-pill rounded-full px-3 py-1">{basicsUnlockedCount} basics set</span>
                          <span className="stamp-pill rounded-full px-3 py-1">{verifiedUnlockedCount} verified stamps</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.25rem] border border-slate-200 bg-white/80 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="kicker">Basic info</p>
                        <p className="mt-1 text-sm text-slate-600">Self-declared traits that help match you to better opportunities.</p>
                      </div>
                      <p className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                        Passport basics
                      </p>
                    </div>

                    <form action={updateSelfDeclaredSkills} className="mt-4 space-y-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        {SELF_DECLARED_STAMPS.map((stamp) => {
                          const enabled = unlockedSkills.has(stamp);

                          return (
                            <label
                              key={stamp}
                              className={cn(
                                "flex items-center gap-3 rounded-[1.1rem] border p-3 text-sm transition",
                                enabled ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white"
                              )}
                            >
                              <input
                                type="checkbox"
                                name="selfDeclaredSkills"
                                value={stamp}
                                defaultChecked={enabled}
                                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                              />
                              <span className="font-semibold text-slate-800">{STAMP_LABELS[stamp]}</span>
                            </label>
                          );
                        })}
                      </div>

                      <button type="submit" className="primary-action rounded-full px-4 py-2 text-sm font-semibold">
                        Save basic info
                      </button>
                    </form>
                  </div>
                </div>
              )}
              pageTwo={(
                <div className="space-y-4">
                  <article className="rounded-[1.25rem] border border-slate-200 bg-white/90 p-4 sm:p-5">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="kicker">Page 2 · Visas</p>
                        <h2 className="display-font mt-1 text-2xl font-semibold text-slate-900">Official visas</h2>
                        <p className="mt-2 text-sm text-slate-600">These are the hard-to-get certs that get stamped after review.</p>
                      </div>
                      <p className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700">
                        {verifiedUnlockedCount} / {VERIFIED_STAMPS.length} approved
                      </p>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      {VERIFIED_STAMPS.map((stamp) => {
                        const isUnlocked = unlockedSkills.has(stamp);

                        return (
                          <article
                            key={stamp}
                            className={cn(
                              "rounded-[1.15rem] border p-4",
                              isUnlocked ? "border-slate-900 bg-white" : "border-slate-200 bg-white/70"
                            )}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-semibold text-slate-900">{STAMP_LABELS[stamp]}</p>
                              <span className={cn(
                                "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                                isUnlocked ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-700"
                              )}>
                                {isUnlocked ? "Stamped" : "Awaiting"}
                              </span>
                            </div>

                            <p className="mt-2 text-xs leading-5 text-slate-600">
                              {isUnlocked ? "Admin verified and ready to use in matching." : "Upload proof to request official verification."}
                            </p>
                          </article>
                        );
                      })}
                    </div>
                  </article>

                  <form action={requestSkillVerification} className="rounded-[1.25rem] border border-slate-200 bg-white/80 p-4">
                    <p className="kicker">Submit proof</p>
                    <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
                      <div>
                        <label className="block text-sm font-semibold text-slate-900" htmlFor="verified-stamp-select">
                          Stamp to verify
                        </label>
                        <select
                          id="verified-stamp-select"
                          name="stamp"
                          defaultValue={VERIFIED_STAMPS[0]}
                          className="input-shell mt-2"
                        >
                          {VERIFIED_STAMPS.map((stamp) => (
                            <option key={stamp} value={stamp}>
                              {STAMP_LABELS[stamp]}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-900" htmlFor="verification-proof">
                          Proof document
                        </label>
                        <input
                          id="verification-proof"
                          name="proof"
                          type="file"
                          accept="image/*,application/pdf"
                          className="input-shell mt-2 file:mr-4 file:rounded-full file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white"
                        />
                      </div>

                      <div className="flex items-end">
                        <button type="submit" className="primary-action w-full rounded-full px-4 py-3 text-sm font-semibold">
                          Submit proof
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}
              pageThree={(
                <div className="space-y-4">
                  <article className="rounded-[1.25rem] border border-slate-200 bg-[linear-gradient(160deg,#fffdf8,#f5efe3)] p-4 sm:p-5">
                    <p className="kicker">Page 3 · Journey summary</p>
                    <h2 className="display-font mt-1 text-2xl font-semibold text-slate-900">Volunteer record snapshot</h2>
                    <p className="mt-2 text-sm text-slate-600">
                      A clean look at your totals and what is left to unlock next.
                    </p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[1.15rem] border border-emerald-200 bg-emerald-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Total events</p>
                        <p className="mt-2 display-font text-4xl font-semibold text-emerald-900">{profile.completed_events}</p>
                        <p className="mt-1 text-sm text-emerald-800">Completed opportunities</p>
                      </div>

                      <div className="rounded-[1.15rem] border border-cyan-200 bg-cyan-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">Total hours</p>
                        <p className="mt-2 display-font text-4xl font-semibold text-cyan-900">{profile.completed_hours}</p>
                        <p className="mt-1 text-sm text-cyan-800">Hours contributed</p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 rounded-[1.2rem] border border-slate-200 bg-white/85 p-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Hours track</p>
                        <p className="mt-1 text-sm text-slate-700">
                          {nextHoursMilestone ? `${nextHoursMilestone.currentValue} / ${nextHoursMilestone.target} hours` : "Complete"}
                        </p>
                        {nextHoursMilestone ? (
                          <div className="mt-2 h-2 rounded-full bg-slate-200">
                            <div
                              className="h-2 rounded-full bg-[linear-gradient(90deg,#0b5d66,#0f766e)]"
                              style={{ width: `${nextHoursMilestone.progress}%` }}
                            />
                          </div>
                        ) : null}
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Events track</p>
                        <p className="mt-1 text-sm text-slate-700">
                          {nextEventsMilestone ? `${nextEventsMilestone.currentValue} / ${nextEventsMilestone.target} events` : "Complete"}
                        </p>
                        {nextEventsMilestone ? (
                          <div className="mt-2 h-2 rounded-full bg-slate-200">
                            <div
                              className="h-2 rounded-full bg-[linear-gradient(90deg,#c45c2d,#a4461f)]"
                              style={{ width: `${nextEventsMilestone.progress}%` }}
                            />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </article>

                  <article className="rounded-[1.25rem] border border-slate-200 bg-white/80 p-4">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="kicker">Milestone ledger</p>
                        <h2 className="display-font mt-1 text-2xl font-semibold text-slate-900">Auto-earned stamps</h2>
                      </div>
                      {nextOverallMilestone ? (
                        <div className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700">
                          Next: {STAMP_LABELS[nextOverallMilestone.stamp]}
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {AUTO_EARNED_STAMPS.map((stamp) => {
                        const { requirement, currentValue, progress, isUnlocked } = getAutoEarnedProgress(stamp, profile);

                        return (
                          <article
                            key={stamp}
                            className={cn(
                              "rounded-[1.1rem] border p-4",
                              isUnlocked ? "border-slate-900 bg-white" : "border-slate-200 bg-white/70"
                            )}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-semibold text-slate-900">{STAMP_LABELS[stamp]}</p>
                              <span className={cn(
                                "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                                isUnlocked ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-700"
                              )}>
                                {isUnlocked ? "Unlocked" : "Locked"}
                              </span>
                            </div>
                            <p className="mt-2 text-xs text-slate-600">
                              {requirement.metric === "hours" ? "Hours milestone" : "Events milestone"}
                            </p>
                            {!isUnlocked ? (
                              <>
                                <p className="mt-2 text-xs text-slate-700">
                                  {Math.min(currentValue, requirement.target)} / {requirement.target}
                                </p>
                                <div className="mt-2 h-2 rounded-full bg-slate-200">
                                  <div className="h-2 rounded-full bg-[linear-gradient(90deg,#0b5d66,#c45c2d)]" style={{ width: `${progress}%` }} />
                                </div>
                              </>
                            ) : (
                              <p className="mt-2 text-xs font-semibold text-slate-700">Milestone complete.</p>
                            )}
                          </article>
                        );
                      })}
                    </div>

                    <div className="mt-4 grid gap-3 rounded-[1.25rem] border border-slate-200 bg-white/80 p-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Hours track</p>
                        <p className="mt-1 text-sm text-slate-700">
                          {nextHoursMilestone ? `${nextHoursMilestone.currentValue} / ${nextHoursMilestone.target} hours` : "Complete"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Events track</p>
                        <p className="mt-1 text-sm text-slate-700">
                          {nextEventsMilestone ? `${nextEventsMilestone.currentValue} / ${nextEventsMilestone.target} events` : "Complete"}
                        </p>
                      </div>
                    </div>
                  </article>
                </div>
              )}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
