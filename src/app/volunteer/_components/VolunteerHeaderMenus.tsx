import Link from "next/link";
import { getApplicationStatusLabel } from "@/lib/application-status";
import {
  getVolunteerApplicationEarnedHoursLabel,
  getVolunteerApplicationEventTitle,
  splitVolunteerApplicationsByEventStatus
} from "@/lib/volunteer-application-utils";
import { signOut, updateProfileName } from "@/app/volunteer/actions";
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
  const { currentApplications, pastApplications } = splitVolunteerApplicationsByEventStatus(myApplications);
  const profileSummaryLabel = isSignedIn && profile?.name
    ? `Profile: ${profile.name.split(" ")[0]}`
    : "Profile";

  return (
    <div className="flex shrink-0 gap-2">
      <details className="relative">
        <summary className="cursor-pointer list-none rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900">
          Current volunteering events
        </summary>
        <div className="absolute right-0 top-full z-10 mt-2 w-72 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          {isSignedIn ? (
            currentApplications.length > 0 ? (
              <div className="space-y-2">
                {currentApplications.map((application) => (
                  <div key={application.id} className="rounded-md border border-gray-200 px-2 py-1 text-xs">
                    <p className="font-medium text-gray-800">{getVolunteerApplicationEventTitle(application)}</p>
                    <p className="text-gray-600">Status: {getApplicationStatusLabel(application.status)}</p>
                    {application.applied_at ? (
                      <p className="text-gray-500">Applied: {new Date(application.applied_at).toLocaleDateString()}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No current volunteering events.</p>
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
          Past volunteering events
        </summary>
        <div className="absolute right-0 top-full z-10 mt-2 w-72 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          {isSignedIn ? (
            pastApplications.length > 0 ? (
              <div className="space-y-2">
                {pastApplications.map((application) => (
                  <div key={application.id} className="rounded-md border border-gray-200 px-2 py-1 text-xs">
                    <p className="font-medium text-gray-800">{getVolunteerApplicationEventTitle(application)}</p>
                    <p className="text-gray-600">Status: {getApplicationStatusLabel(application.status)}</p>
                    <p className="text-gray-600">Hours earned: {getVolunteerApplicationEarnedHoursLabel(application)}</p>
                    {application.applied_at ? (
                      <p className="text-gray-500">Applied: {new Date(application.applied_at).toLocaleDateString()}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No past volunteering events yet.</p>
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
          {profileSummaryLabel}
        </summary>
        <div className="absolute right-0 top-full z-10 mt-2 w-72 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          {isSignedIn && profile ? (
            <>
              <p className="text-sm font-semibold text-gray-900">{profile.name}</p>
              <p className="mt-1 text-xs text-gray-500">{profile.contact_email || userEmail}</p>

              <form action={updateProfileName} className="mt-4 space-y-2">
                <label className="block text-xs uppercase tracking-wide text-gray-500" htmlFor="profile-name-menu">
                  Full name
                </label>
                <input
                  id="profile-name-menu"
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

              <Link href="/volunteer/profile" className="mt-4 inline-flex w-full justify-center rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900">
                Open progression board
              </Link>

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
