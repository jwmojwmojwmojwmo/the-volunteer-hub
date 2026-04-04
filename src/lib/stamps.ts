export const STAMPS = {
    POLICE_CHECK: "police-check",
    FORKLIFT: "forklift-certified",
    HOURS_40: "40-hours",
    FIRST_AID: "first-aid",
    DRIVERS_LICENSE: "drivers-license",
    OVER_18: "over-18"
} as const;

export const AUTO_EARNED_STAMPS = [STAMPS.HOURS_40] as const;

export const VERIFIED_STAMPS = [STAMPS.POLICE_CHECK, STAMPS.FORKLIFT, STAMPS.FIRST_AID] as const;

export const STAMP_LABELS: Record<(typeof STAMPS)[keyof typeof STAMPS], string> = {
    [STAMPS.POLICE_CHECK]: "Police check",
    [STAMPS.FORKLIFT]: "Forklift certified",
    [STAMPS.HOURS_40]: "40 hours",
    [STAMPS.FIRST_AID]: "First aid",
    [STAMPS.DRIVERS_LICENSE]: "Class 5 Driver's license",
    [STAMPS.OVER_18]: "Adult (18+)"
};