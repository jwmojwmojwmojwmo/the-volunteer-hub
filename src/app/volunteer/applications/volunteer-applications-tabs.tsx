"use client";

import { useState } from "react";
import { getApplicationStatusLabel } from "@/lib/application-status";
import { cn } from "@/lib/utils";

type ApplicationViewItem = {
  id: string;
  title: string;
  status: string;
  appliedAt: string | null;
  hoursLabel: string;
};

type VolunteerApplicationsTabsProps = {
  initialTab: "applied" | "accepted" | "rejected" | "past";
  appliedItems: ApplicationViewItem[];
  acceptedItems: ApplicationViewItem[];
  rejectedItems: ApplicationViewItem[];
  pastItems: ApplicationViewItem[];
};

type TabKey = "applied" | "accepted" | "rejected" | "past";

const TAB_LABELS: Record<TabKey, string> = {
  applied: "Applied",
  accepted: "Accepted",
  rejected: "Rejected",
  past: "Past"
};

export default function VolunteerApplicationsTabs({
  initialTab,
  appliedItems,
  acceptedItems,
  rejectedItems,
  pastItems
}: VolunteerApplicationsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  const itemsByTab: Record<TabKey, ApplicationViewItem[]> = {
    applied: appliedItems,
    accepted: acceptedItems,
    rejected: rejectedItems,
    past: pastItems
  };

  const activeItems = itemsByTab[activeTab];

  return (
    <section className="paper-panel-strong rounded-[2rem] p-5 sm:p-7">
      <h2 className="display-font text-4xl font-semibold text-slate-900 sm:text-5xl">My Applications</h2>
      <p className="mt-2 text-sm text-slate-600">Select one status to review at a time.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {(Object.keys(TAB_LABELS) as TabKey[]).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-semibold min-w-[8.5rem]",
                isActive ? "primary-action" : "secondary-action"
              )}
            >
              {TAB_LABELS[tab]}
            </button>
          );
        })}
      </div>

      <div className="mt-5 space-y-3">
        {activeItems.length > 0 ? (
          activeItems.map((application) => (
            <article key={application.id} className="rounded-[1.2rem] border border-slate-200 bg-white p-4">
              <p className="display-font text-xl font-semibold text-slate-900">{application.title}</p>
              <p className="mt-1 text-sm text-slate-700">Status: {getApplicationStatusLabel(application.status)}</p>
              <p className="mt-1 text-sm text-slate-700">Hours earned: {application.hoursLabel}</p>
              {application.appliedAt ? (
                <p className="mt-1 text-xs text-slate-600">Applied: {new Date(application.appliedAt).toLocaleDateString()}</p>
              ) : null}
            </article>
          ))
        ) : (
          <p className="text-sm text-slate-600">No applications in this section.</p>
        )}
      </div>
    </section>
  );
}
