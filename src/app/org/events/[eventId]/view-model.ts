import { APPLICATION_STATUSES, isPendingOrgReviewStatus } from "@/lib/application-status";

export type EventVolunteerApplication = {
  id: string;
  volunteer_id: string;
  status: string;
  attended: boolean;
  org_rating: number | null;
  applied_at: string;
};

export type VolunteerSummary = {
  id: string;
  name: string;
  contact_email: string | null;
  skills: string[] | null;
  completed_hours: number;
  completed_events: number;
  rating: number;
};

export function getAttendanceLabel(attended: boolean) {
  return attended ? "Present" : "Absent / not marked";
}

export function getVolunteerDisplayName(volunteerId: string, profileName?: string | null) {
  if (profileName && profileName.trim().length > 0) {
    return profileName;
  }

  return `Volunteer ${volunteerId.slice(0, 8)}`;
}

export function buildVolunteersById(volunteers: VolunteerSummary[]) {
  return new Map(volunteers.map((volunteer) => [volunteer.id, volunteer]));
}

export function splitApplicationsByStatus(applications: EventVolunteerApplication[]) {
  const acceptedApplications = applications.filter(
    (application) => application.status === APPLICATION_STATUSES.ACCEPTED
  );
  const appliedApplications = applications.filter((application) => isPendingOrgReviewStatus(application.status));

  return { acceptedApplications, appliedApplications };
}
