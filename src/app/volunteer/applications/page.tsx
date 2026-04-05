import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VolunteerHeaderMenus from "@/app/volunteer/_components/VolunteerHeaderMenus";
import ReloadButton from "@/components/ReloadButton";
import { APPLICATION_STATUSES } from "@/lib/application-status";
import { buildEventMetaById, normalizeVolunteerApplications } from "@/lib/volunteer-application-utils";
import {
  getVolunteerApplicationEarnedHoursLabel,
  getVolunteerApplicationEventTitle,
  splitVolunteerApplicationsByEventStatus
} from "@/lib/volunteer-application-utils";
import type { VolunteerApplication } from "@/types/volunteer";
import VolunteerApplicationsTabs from "./volunteer-applications-tabs";

type VolunteerApplicationsPageProps = {
  searchParams?: Promise<{
    tab?: string;
  }>;
};

type ApplicationViewItem = {
  id: string;
  title: string;
  status: string;
  appliedAt: string | null;
  hoursLabel: string;
};

export default async function VolunteerApplicationsPage({ searchParams }: VolunteerApplicationsPageProps) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;

  if (!user) {
    redirect("/login");
  }

  const { data: applicationsData } = await supabase
    .from("event_applications")
    .select("id, event_id, status, attended, applied_at, events(title, status, hours_given)")
    .eq("volunteer_id", user.id)
    .order("applied_at", { ascending: false });

  const { data: eventsData } = await supabase
    .from("events")
    .select("id, title, status, hours_given, created_at, description, address, lat, lng, compensation, max_volunteers, organizations(id, name), skills_needed, event_applications(id, status), tags(name)")
    .in("id", (applicationsData ?? []).map((application) => application.event_id));

  const applications = normalizeVolunteerApplications(
    (applicationsData ?? []) as VolunteerApplication[],
    buildEventMetaById((eventsData ?? []) as any)
  );
  const { currentApplications, pastApplications } = splitVolunteerApplicationsByEventStatus(applications);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const tabParam = (resolvedSearchParams?.tab || "").toLowerCase();
  const initialTab = tabParam === "accepted" || tabParam === "rejected" || tabParam === "past" ? tabParam : "applied";

  const currentViewItems: ApplicationViewItem[] = currentApplications.map((application) => ({
    id: application.id,
    title: getVolunteerApplicationEventTitle(application),
    status: application.status,
    appliedAt: application.applied_at ?? null,
    hoursLabel: getVolunteerApplicationEarnedHoursLabel(application)
  }));

  const pastViewItems: ApplicationViewItem[] = pastApplications.map((application) => ({
    id: application.id,
    title: getVolunteerApplicationEventTitle(application),
    status: application.status,
    appliedAt: application.applied_at ?? null,
    hoursLabel: getVolunteerApplicationEarnedHoursLabel(application)
  }));

  const appliedItems = currentViewItems.filter((application) =>
    application.status === APPLICATION_STATUSES.APPLIED
    || application.status === APPLICATION_STATUSES.WAITLISTED
    || application.status === APPLICATION_STATUSES.NEEDS_SKILL_VERIFICATION
  );
  const acceptedItems = currentViewItems.filter((application) => application.status === APPLICATION_STATUSES.ACCEPTED);
  const rejectedItems = currentViewItems.filter((application) =>
    application.status === APPLICATION_STATUSES.DECLINED
    || application.status === APPLICATION_STATUSES.WITHDRAWN
  );

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="paper-panel rounded-[1.6rem] px-4 py-4 sm:px-5 sm:py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <VolunteerHeaderMenus isSignedIn={Boolean(user)} />
            <ReloadButton label="Refresh" />
          </div>
        </section>

        <VolunteerApplicationsTabs
          initialTab={initialTab as "applied" | "accepted" | "rejected" | "past"}
          appliedItems={appliedItems}
          acceptedItems={acceptedItems}
          rejectedItems={rejectedItems}
          pastItems={pastViewItems}
        />
      </div>
    </main>
  );
}
