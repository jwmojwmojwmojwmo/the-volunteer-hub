"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type OrgHeaderNavProps = {
  isSignedIn: boolean;
};

const NAV_ITEMS = [
  { label: "My Events", href: "/org/events" },
  { label: "Organization Profile", href: "/org/profile" }
] as const;

export default function OrgHeaderNav({ isSignedIn }: OrgHeaderNavProps) {
  const pathname = usePathname();

  if (!isSignedIn) {
    return (
      <Link href="/org/login" className="primary-action rounded-full px-4 py-2 text-sm font-semibold">
        Log in
      </Link>
    );
  }

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || (item.href === "/org/profile" && pathname.startsWith("/organizations/"));

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold transition whitespace-nowrap min-w-[9.5rem] text-center",
              isActive ? "primary-action ring-2 ring-offset-1 ring-slate-900" : "stamp-pill"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}