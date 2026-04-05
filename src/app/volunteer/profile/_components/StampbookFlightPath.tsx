import { cn } from "@/lib/utils";

type StampbookFlightPathProps = {
  completedEvents: number;
  completedHours: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function pointOnCurve(t: number) {
  const start = { x: 12, y: 58 };
  const control = { x: 56, y: 14 };
  const end = { x: 108, y: 58 };
  const eased = clamp(t, 0, 1);

  const oneMinusT = 1 - eased;
  const x = oneMinusT * oneMinusT * start.x + 2 * oneMinusT * eased * control.x + eased * eased * end.x;
  const y = oneMinusT * oneMinusT * start.y + 2 * oneMinusT * eased * control.y + eased * eased * end.y;

  return { x, y };
}

function milestonePoint(progress: number) {
  return pointOnCurve(progress);
}

export default function StampbookFlightPath({ completedEvents, completedHours }: StampbookFlightPathProps) {
  const routeProgress = clamp(completedEvents / 12, 0, 1);
  const progressMarker = pointOnCurve(routeProgress);
  const firstStamp = milestonePoint(0.25);
  const secondStamp = milestonePoint(0.65);
  const thirdStamp = milestonePoint(1);
  const firstUnlocked = completedEvents >= 1;
  const secondUnlocked = completedEvents >= 5;
  const thirdUnlocked = completedEvents >= 12;
  const hourProgress = clamp(completedHours / 500, 0, 1);

  return (
    <section className="rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(180deg,#fffdfa,#f5efe3)] p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="kicker">Progress ledger</p>
          <h2 className="display-font mt-1 text-2xl font-semibold text-slate-900">Milestone timeline</h2>
        </div>
        <div className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
          {completedEvents} events completed
        </div>
      </div>

      <div className="stampbook-route mt-4 overflow-hidden rounded-[1.5rem] border border-slate-200 p-4">
        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          <span>Start</span>
          <span>Target</span>
        </div>

        <svg viewBox="0 0 120 92" className="mt-3 h-64 w-full" role="img" aria-label="Volunteer milestone progress">
          <defs>
            <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0b5d66" />
              <stop offset="100%" stopColor="#c45c2d" />
            </linearGradient>
          </defs>

          <path
            d="M 12 58 C 28 18, 52 14, 60 34 S 92 82, 108 58"
            fill="none"
            stroke="rgba(20, 33, 46, 0.12)"
            strokeWidth="1.8"
            strokeDasharray="4 6"
            strokeLinecap="round"
          />

          <path
            d="M 12 58 C 28 18, 52 14, 60 34 S 92 82, 108 58"
            fill="none"
            stroke="url(#pathGradient)"
            strokeWidth="3"
            strokeDasharray="4 6"
            strokeLinecap="round"
            strokeDashoffset={-12}
            opacity={0.25 + routeProgress * 0.45}
          />

          <g transform={`translate(${firstStamp.x}, ${firstStamp.y})`}>
            <circle r="7" fill={firstUnlocked ? "#0b5d66" : "#f2ebe0"} stroke={firstUnlocked ? "#08444c" : "#c7cdd1"} strokeWidth="1.5" />
            <circle r="3.4" fill={firstUnlocked ? "#ffffff" : "#c7cdd1"} />
          </g>

          <g transform={`translate(${secondStamp.x}, ${secondStamp.y})`}>
            <circle r="7" fill={secondUnlocked ? "#c45c2d" : "#f2ebe0"} stroke={secondUnlocked ? "#a4461f" : "#c7cdd1"} strokeWidth="1.5" />
            <circle r="3.4" fill={secondUnlocked ? "#ffffff" : "#c7cdd1"} />
          </g>

          <g transform={`translate(${thirdStamp.x}, ${thirdStamp.y})`}>
            <circle r="7" fill={thirdUnlocked ? "#8d3b5e" : "#f2ebe0"} stroke={thirdUnlocked ? "#6e2946" : "#c7cdd1"} strokeWidth="1.5" />
            <circle r="3.4" fill={thirdUnlocked ? "#ffffff" : "#c7cdd1"} />
          </g>

          <g transform={`translate(${progressMarker.x}, ${progressMarker.y})`}>
            <circle r="5.5" fill="#ffffff" stroke="#14212e" strokeWidth="1.2" />
            <circle r="2.2" fill="#14212e" />
          </g>

          <text x="12" y="74" fill="#5f6b76" fontSize="4.6" fontWeight="700">
            1 event
          </text>
          <text x="62" y="20" fill="#5f6b76" fontSize="4.6" fontWeight="700" textAnchor="middle">
            5 events
          </text>
          <text x="97" y="74" fill="#5f6b76" fontSize="4.6" fontWeight="700" textAnchor="middle">
            12 events
          </text>
        </svg>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className={cn("rounded-[1.25rem] border p-4", firstUnlocked ? "border-slate-900 bg-white" : "border-slate-200 bg-white/70")}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">First milestone</p>
            <p className="mt-2 display-font text-lg font-semibold text-slate-900">1 event completed</p>
            <p className="mt-1 text-sm text-slate-600">
              {firstUnlocked ? "Milestone reached." : "Not reached yet."}
            </p>
          </div>

          <div className={cn("rounded-[1.25rem] border p-4", secondUnlocked ? "border-slate-900 bg-white" : "border-slate-200 bg-white/70")}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Midpoint milestone</p>
            <p className="mt-2 display-font text-lg font-semibold text-slate-900">5 events completed</p>
            <p className="mt-1 text-sm text-slate-600">
              {secondUnlocked ? "Unlocked." : `${Math.max(5 - completedEvents, 0)} more event${completedEvents === 4 ? "" : "s"} to go.`}
            </p>
          </div>

          <div className={cn("rounded-[1.25rem] border p-4", thirdUnlocked ? "border-slate-900 bg-white" : "border-slate-200 bg-white/70")}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Advanced milestone</p>
            <p className="mt-2 display-font text-lg font-semibold text-slate-900">12 events completed</p>
            <p className="mt-1 text-sm text-slate-600">
              {thirdUnlocked ? "Milestone reached." : `${Math.max(12 - completedEvents, 0)} more to complete this milestone.`}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-[1.25rem] border border-slate-200 bg-white/75 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Hours progress</p>
              <p className="mt-1 text-sm text-slate-600">A second track keeps long-term totals visible without overwhelming the page.</p>
            </div>
            <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
              {completedHours} hours logged
            </div>
          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#0b5d66,#c45c2d)]"
              style={{ width: `${Math.max(6, Math.round(hourProgress * 100))}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}