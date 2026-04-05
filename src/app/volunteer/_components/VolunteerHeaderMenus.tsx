import Link from "next/link";
import { getApplicationStatusLabel } from "@/lib/application-status";
import { AUTO_EARNED_STAMPS, STAMP_LABELS, VERIFIED_STAMPS } from "@/lib/stamps";
import { requestSkillVerification, signOut, updateProfileName } from "@/app/volunteer/actions";
import type { VolunteerApplication, VolunteerProfile } from "@/types/volunteer";

type VolunteerHeaderMenusProps = {
  isSignedIn: boolean;
  userEmail?: string;
  profile: VolunteerProfile | null;
  myApplications: VolunteerApplication[];
};

export default function VolunteerHeaderMenus({
  isSignedIn,
  userEmail,
  profile,
  myApplications
}: VolunteerHeaderMenusProps) {
  return (
    <div className="flex shrink-0 gap-2">
      <details className="relative">
        <summary className="cursor-pointer list-none rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900">
          Current volunteering events
        </summary>
        <div className="absolute right-0 top-full z-10 mt-2 w-72 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          {isSignedIn ? (
            myApplications.length > 0 ? (
              <div className="space-y-2">
                {myApplications.map((application) => (
                  <div key={application.id} className="rounded-md border border-gray-200 px-2 py-1 text-xs">
                    <p className="font-medium text-gray-800">{application.events?.[0]?.title || "Event"}</p>
                    <p className="text-gray-600">Status: {getApplicationStatusLabel(application.status)}</p>
                    {application.applied_at ? (
                      <p className="text-gray-500">Applied: {new Date(application.applied_at).toLocaleDateString()}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No applications yet.</p>
            )
          ) : (
            <Link href="/login" className="inline-flex rounded-md bg-black px-4 py-2 text-sm font-medium text-white">
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
          {isSignedIn && profile ? (
            <>
              <p className="text-sm font-semibold text-gray-900">{profile.name}</p>
              <p className="mt-1 text-xs text-gray-500">{profile.contact_email || userEmail}</p>

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
                <button type="submit" className="w-full rounded-md bg-black px-3 py-2 text-sm font-medium text-white">
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-gray-900">Not signed in</p>
              <p className="mt-1 text-sm text-gray-600">Sign in to see your profile and skills.</p>
              <Link href="/login" className="mt-4 inline-flex rounded-md bg-black px-4 py-2 text-sm font-medium text-white">
                Go to login
              </Link>
            </>
          )}
        </div>
      </details>
    </div>
  );
}
