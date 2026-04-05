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
import { requestSkillVerification, updateSelfDeclaredSkills } from "@/app/volunteer/actions";
import VolunteerHeaderMenus from "@/app/volunteer/_components/VolunteerHeaderMenus";
import ReloadButton from "@/components/ReloadButton";

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

export default async function VolunteerProgressionPage() {
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
      <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-[1.75rem] paper-panel p-6">
          <h1 className="display-font text-3xl font-semibold text-slate-900">Profile not found</h1>
          <p className="mt-2 text-sm text-slate-600">We could not load your volunteer profile yet.</p>
          <Link href="/volunteer/profile" className="mt-4 inline-flex rounded-full secondary-action px-4 py-2 text-sm font-semibold">
            Back to profile
          </Link>
        </div>
      </main>
    );
  }

  const unlockedSkills = new Set(profile.skills ?? []);
  const verifiedUnlockedCount = VERIFIED_STAMPS.filter((stamp) => unlockedSkills.has(stamp)).length;

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="paper-panel rounded-[1.6rem] px-4 py-4 sm:px-5 sm:py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <VolunteerHeaderMenus isSignedIn={Boolean(user)} />
            <ReloadButton label="Refresh" />
          </div>
        </section>

        <section className="paper-panel-strong rounded-[2rem] p-5 sm:p-7">
          <p className="kicker">Progression board</p>
          <h1 className="display-font mt-1 text-4xl font-semibold text-slate-900 sm:text-5xl">Credentials and milestones</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">This page is only for skill credentials and progress milestones.</p>
        </section>

        <section className="paper-panel rounded-[1.75rem] p-5 sm:p-6">
          <p className="kicker">Credentials</p>
          <h2 className="display-font mt-1 text-2xl font-semibold text-slate-900">Skills and verification</h2>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <article className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Self-declared skills</p>
              <p className="mt-1 text-sm text-slate-600">Select the skills that apply to you.</p>

              <form action={updateSelfDeclaredSkills} className="mt-4 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {SELF_DECLARED_STAMPS.map((stamp) => {
                    const enabled = unlockedSkills.has(stamp);

                    return (
                      <label
                        key={stamp}
                        className={cn(
                          "flex items-center gap-3 rounded-[1rem] border p-3 text-sm",
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
                        <span className="font-semibold text-slate-900">{STAMP_LABELS[stamp]}</span>
                      </label>
                    );
                  })}
                </div>

                <button type="submit" className="primary-action rounded-full px-4 py-2 text-sm font-semibold">
                  Save skills
                </button>
              </form>
            </article>

            <article className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Verified certifications</p>
              <p className="mt-1 text-sm text-slate-600">Verified: {verifiedUnlockedCount} / {VERIFIED_STAMPS.length}</p>

              <div className="mt-3 grid gap-2">
                {VERIFIED_STAMPS.map((stamp) => {
                  const isUnlocked = unlockedSkills.has(stamp);

                  return (
                    <div key={stamp} className="rounded-[1rem] border border-slate-200 bg-slate-50 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">{STAMP_LABELS[stamp]}</p>
                        <span className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                          isUnlocked ? "primary-action" : "secondary-action"
                        )}>
                          {isUnlocked ? "Verified" : "Pending"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form action={requestSkillVerification} className="mt-4 space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-900" htmlFor="verified-stamp-select">
                    Certification
                  </label>
                  <select id="verified-stamp-select" name="stamp" defaultValue={VERIFIED_STAMPS[0]} className="input-shell mt-2">
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
                    className="input-shell mt-2"
                  />
                </div>

                <button type="submit" className="primary-action rounded-full px-4 py-2 text-sm font-semibold">
                  Submit proof
                </button>
              </form>
            </article>
          </div>
        </section>

        <section className="paper-panel rounded-[1.75rem] p-5 sm:p-6">
          <p className="kicker">Milestones</p>
          <h2 className="display-font mt-1 text-2xl font-semibold text-slate-900">Progress milestones</h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1rem] border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Completed hours</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{profile.completed_hours}</p>
            </div>
            <div className="rounded-[1rem] border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Completed events</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{profile.completed_events}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {AUTO_EARNED_STAMPS.map((stamp) => {
              const { requirement, currentValue, progress, isUnlocked } = getAutoEarnedProgress(stamp, profile);

              return (
                <article key={stamp} className="rounded-[1rem] border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{STAMP_LABELS[stamp]}</p>
                    <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", isUnlocked ? "primary-action" : "secondary-action")}>
                      {isUnlocked ? "Unlocked" : "Locked"}
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-slate-600">
                    {requirement.metric === "hours" ? "Hours milestone" : "Events milestone"}
                  </p>
                  <p className="mt-2 text-xs text-slate-700">{Math.min(currentValue, requirement.target)} / {requirement.target}</p>
                  <div className="mt-2 h-2 rounded-full bg-slate-200">
                    <div className="h-2 rounded-full bg-slate-700" style={{ width: `${progress}%` }} />
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
