"use client";

import Link from "next/link";
import { useEffect, useRef, type RefObject } from "react";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const currentMenuRef = useRef<HTMLDetailsElement>(null);
  const pastMenuRef = useRef<HTMLDetailsElement>(null);
  const profileMenuRef = useRef<HTMLDetailsElement>(null);

  const closeAllMenus = () => {
    [currentMenuRef, pastMenuRef, profileMenuRef].forEach((menuRef) => {
      if (menuRef.current?.open) {
        menuRef.current.open = false;
      }
    });
  };

  const closeOtherMenus = (activeRef: RefObject<HTMLDetailsElement | null>) => {
    const refs = [currentMenuRef, pastMenuRef, profileMenuRef];
    refs.forEach((menuRef) => {
      if (menuRef !== activeRef && menuRef.current?.open) {
        menuRef.current.open = false;
      }
    });
  };

  const handleMenuToggle = (menuRef: RefObject<HTMLDetailsElement | null>) => {
    if (menuRef.current?.open) {
      closeOtherMenus(menuRef);
    }
  };

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (!containerRef.current.contains(target)) {
        closeAllMenus();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeAllMenus();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const { currentApplications, pastApplications } = splitVolunteerApplicationsByEventStatus(myApplications);
  const profileSummaryLabel = isSignedIn && profile?.name
    ? `Profile: ${profile.name.split(" ")[0]}`
    : "Profile";

  return (
    <div ref={containerRef} className="flex shrink-0 flex-wrap gap-2">
      <details ref={currentMenuRef} className="relative" onToggle={() => handleMenuToggle(currentMenuRef)}>
        <summary className="stamp-pill cursor-pointer list-none rounded-full px-4 py-2 text-sm font-semibold">
          Current volunteering events
        </summary>
        <div className="paper-panel-strong absolute right-0 top-full z-10 mt-3 w-80 rounded-[1.5rem] p-4 sm:p-5">
          {isSignedIn ? (
            currentApplications.length > 0 ? (
              <div className="space-y-2">
                {currentApplications.map((application) => (
                  <div key={application.id} className="rounded-[1.1rem] border border-slate-200 bg-white/80 px-3 py-3 text-xs">
                    <p className="font-semibold text-slate-800">{getVolunteerApplicationEventTitle(application)}</p>
                    <p className="text-slate-600">Status: {getApplicationStatusLabel(application.status)}</p>
                    {application.applied_at ? (
                      <p className="text-slate-500">Applied: {new Date(application.applied_at).toLocaleDateString()}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-600">No current volunteering events.</p>
            )
          ) : (
            <Link href="/login" className="inline-flex rounded-[1rem] primary-action px-4 py-2.5 text-sm font-semibold">
              Go to login
            </Link>
          )}
        </div>
      </details>

      <details ref={pastMenuRef} className="relative" onToggle={() => handleMenuToggle(pastMenuRef)}>
        <summary className="stamp-pill cursor-pointer list-none rounded-full px-4 py-2 text-sm font-semibold">
          Past volunteering events
        </summary>
        <div className="paper-panel-strong absolute right-0 top-full z-10 mt-3 w-80 rounded-[1.5rem] p-4 sm:p-5">
          {isSignedIn ? (
            pastApplications.length > 0 ? (
              <div className="space-y-2">
                {pastApplications.map((application) => (
                  <div key={application.id} className="rounded-[1.1rem] border border-slate-200 bg-white/80 px-3 py-3 text-xs">
                    <p className="font-semibold text-slate-800">{getVolunteerApplicationEventTitle(application)}</p>
                    <p className="text-slate-600">Status: {getApplicationStatusLabel(application.status)}</p>
                    <p className="text-slate-600">Hours earned: {getVolunteerApplicationEarnedHoursLabel(application)}</p>
                    {application.applied_at ? (
                      <p className="text-slate-500">Applied: {new Date(application.applied_at).toLocaleDateString()}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-600">No past volunteering events yet.</p>
            )
          ) : (
            <Link href="/login" className="inline-flex rounded-[1rem] primary-action px-4 py-2.5 text-sm font-semibold">
              Go to login
            </Link>
          )}
        </div>
      </details>

      <details ref={profileMenuRef} className="relative" onToggle={() => handleMenuToggle(profileMenuRef)}>
        <summary className="stamp-pill cursor-pointer list-none rounded-full px-4 py-2 text-sm font-semibold">
          {profileSummaryLabel}
        </summary>
        <div className="paper-panel-strong absolute right-0 top-full z-10 mt-3 w-80 rounded-[1.5rem] p-4 sm:p-5">
          {isSignedIn && profile ? (
            <>
              <p className="text-sm font-semibold text-slate-900">{profile.name}</p>
              <p className="mt-1 text-xs text-slate-500">{profile.contact_email || userEmail}</p>

              <form action={updateProfileName} className="mt-4 space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500" htmlFor="profile-name-menu">
                  Full name
                </label>
                <input
                  id="profile-name-menu"
                  name="name"
                  defaultValue={profile.name}
                  className="input-shell"
                />
                <button
                  type="submit"
                  className="secondary-action w-full rounded-[1rem] px-3 py-2.5 text-sm font-semibold"
                >
                  Save name
                </button>
              </form>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Hours</p>
                  <p className="font-semibold text-slate-900">{profile.completed_hours}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Events</p>
                  <p className="font-semibold text-slate-900">{profile.completed_events}</p>
                </div>
              </div>

              <Link href="/volunteer/profile" className="mt-4 inline-flex w-full justify-center rounded-[1rem] primary-action px-3 py-2.5 text-sm font-semibold">
                Open progression board
              </Link>

              <form action={signOut} className="mt-4">
                <button type="submit" className="primary-action w-full rounded-[1rem] px-3 py-2.5 text-sm font-semibold">
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-slate-900">Not signed in</p>
              <p className="mt-1 text-sm text-slate-600">Sign in to see your profile and skills.</p>
              <Link href="/login" className="mt-4 inline-flex rounded-[1rem] primary-action px-4 py-2.5 text-sm font-semibold">
                Go to login
              </Link>
            </>
          )}
        </div>
      </details>
    </div>
  );
}
