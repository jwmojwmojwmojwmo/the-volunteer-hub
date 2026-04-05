"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ReloadButtonProps = {
  label?: string;
  className?: string;
};

export default function ReloadButton({ label = "Reload", className }: ReloadButtonProps) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  return (
    <button
      type="button"
      onClick={handleRefresh}
      disabled={isRefreshing}
      className={
        className ||
        "rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
      }
      aria-label={label}
    >
      {isRefreshing ? "Refreshing..." : label}
    </button>
  );
}
