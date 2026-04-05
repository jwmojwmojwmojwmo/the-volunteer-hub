"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type PassportFlipbookProps = {
  pageOne: React.ReactNode;
  pageTwo: React.ReactNode;
  pageThree: React.ReactNode;
};

export default function PassportFlipbook({ pageOne, pageTwo, pageThree }: PassportFlipbookProps) {
  const pages = useMemo(
    () => [
      { label: "Overview", content: pageOne },
      { label: "Credentials", content: pageTwo },
      { label: "Milestones", content: pageThree }
    ],
    [pageOne, pageTwo, pageThree]
  );

  const [activePageIndex, setActivePageIndex] = useState(0);
  const activePage = pages[activePageIndex];

  const goToPage = (index: number) => {
    if (index < 0 || index >= pages.length) {
      return;
    }

    setActivePageIndex(index);
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.2rem] border border-slate-200 bg-white/75 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/88">
        <div className="flex flex-wrap items-center gap-2">
          {pages.map((page, index) => (
            <button
              key={page.label}
              type="button"
              onClick={() => goToPage(index)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                index === activePageIndex
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-500"
              )}
            >
              Page {index + 1}: {page.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => goToPage(activePageIndex - 1)}
            disabled={activePageIndex === 0}
            className="secondary-action rounded-full px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => goToPage(activePageIndex + 1)}
            disabled={activePageIndex === pages.length - 1}
            className="primary-action rounded-full px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      <div className="min-h-[56rem] rounded-[2rem] border border-slate-200 bg-white/92 p-4 shadow-[0_26px_60px_rgba(20,33,46,0.15)] dark:border-slate-800 dark:bg-slate-950/92 dark:shadow-[0_26px_60px_rgba(0,0,0,0.36)] sm:min-h-[52rem] sm:p-6 lg:min-h-[50rem]">
        <article className="h-full rounded-[1.4rem] border border-slate-200 bg-white/92 p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.7)] dark:border-slate-800 dark:bg-slate-950/88 dark:shadow-[inset_0_0_0_1px_rgba(15,23,42,0.55)] sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-800">
            <p className="kicker">Volunteer Progress</p>
            <p className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
              PAGE {activePageIndex + 1} / {pages.length}
            </p>
          </div>

          <div className="h-[calc(100%-3.25rem)] overflow-y-auto pb-6 pr-1">
            {activePage.content}
          </div>
        </article>
      </div>
    </section>
  );
}
