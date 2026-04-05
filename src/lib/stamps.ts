export const STAMPS = {
    // Verified (Needs Admin Approval)
    POLICE_CHECK: "police-check",
    VULNERABLE_SECTOR: "vulnerable-sector",
    FORKLIFT: "forklift-certified",
    FOOD_SAFE: "food-safe",
    CPR: "cpr-certified",
    FIRST_AID: "first-aid",

    // Self-Declared (User can check these off themselves)
    DRIVERS_LICENSE: "drivers-license",
    HAS_VEHICLE: "has-vehicle",
    OVER_18: "over-18",
    BILINGUAL: "bilingual",
    HEAVY_LIFTING: "heavy-lifting",

    // Auto-Earned: Hours
    HOURS_10: "10-hours",
    HOURS_40: "40-hours",
    HOURS_100: "100-hours",
    HOURS_250: "250-hours",
    HOURS_500: "500-hours",

    // Auto-Earned: Events
    EVENTS_1: "1-event",
    EVENTS_5: "5-events",
    EVENTS_10: "10-events",
    EVENTS_25: "25-events",
    EVENTS_50: "50-events"
} as const;

// Milestones the system will award automatically based on their stats
export const AUTO_EARNED_STAMPS = [
    STAMPS.HOURS_10,
    STAMPS.HOURS_40, 
    STAMPS.HOURS_100, 
    STAMPS.HOURS_250,
    STAMPS.HOURS_500,
    STAMPS.EVENTS_1,
    STAMPS.EVENTS_5,
    STAMPS.EVENTS_10,
    STAMPS.EVENTS_25,
    STAMPS.EVENTS_50
] as const;

export const AUTO_EARNED_STAMP_REQUIREMENTS: Record<
    (typeof AUTO_EARNED_STAMPS)[number],
    { metric: "hours" | "events"; target: number }
> = {
    [STAMPS.HOURS_10]: { metric: "hours", target: 10 },
    [STAMPS.HOURS_40]: { metric: "hours", target: 40 },
    [STAMPS.HOURS_100]: { metric: "hours", target: 100 },
    [STAMPS.HOURS_250]: { metric: "hours", target: 250 },
    [STAMPS.HOURS_500]: { metric: "hours", target: 500 },
    [STAMPS.EVENTS_1]: { metric: "events", target: 1 },
    [STAMPS.EVENTS_5]: { metric: "events", target: 5 },
    [STAMPS.EVENTS_10]: { metric: "events", target: 10 },
    [STAMPS.EVENTS_25]: { metric: "events", target: 25 },
    [STAMPS.EVENTS_50]: { metric: "events", target: 50 }
};

// Certs that require a document upload and admin verification
export const VERIFIED_STAMPS = [
    STAMPS.POLICE_CHECK, 
    STAMPS.VULNERABLE_SECTOR,
    STAMPS.FORKLIFT, 
    STAMPS.FIRST_AID,
    STAMPS.CPR,
    STAMPS.FOOD_SAFE
] as const;

// Basics the user can just toggle on their profile
export const SELF_DECLARED_STAMPS = [
    STAMPS.OVER_18,
    STAMPS.DRIVERS_LICENSE,
    STAMPS.HAS_VEHICLE,
    STAMPS.BILINGUAL,
    STAMPS.HEAVY_LIFTING
] as const;

// Friendly labels for the UI
export const STAMP_LABELS: Record<(typeof STAMPS)[keyof typeof STAMPS], string> = {
    [STAMPS.POLICE_CHECK]: "Police check",
    [STAMPS.VULNERABLE_SECTOR]: "Vulnerable Sector Check",
    [STAMPS.FORKLIFT]: "Forklift certified",
    [STAMPS.FOOD_SAFE]: "Food Safe certified",
    [STAMPS.CPR]: "CPR certified",
    [STAMPS.FIRST_AID]: "First aid",
    
    [STAMPS.DRIVERS_LICENSE]: "Class 5 Driver's license",
    [STAMPS.HAS_VEHICLE]: "Has personal vehicle",
    [STAMPS.OVER_18]: "Adult (18+)",
    [STAMPS.BILINGUAL]: "Bilingual / Multilingual",
    [STAMPS.HEAVY_LIFTING]: "Can lift 50+ lbs",

    [STAMPS.HOURS_10]: "10 Hours Completed",
    [STAMPS.HOURS_40]: "40 Hours Completed",
    [STAMPS.HOURS_100]: "100 Hours Completed",
    [STAMPS.HOURS_250]: "250 Hours Completed",
    [STAMPS.HOURS_500]: "500 Hours Completed",

    [STAMPS.EVENTS_1]: "First Event Completed",
    [STAMPS.EVENTS_5]: "5 Events Completed",
    [STAMPS.EVENTS_10]: "10 Events Completed",
    [STAMPS.EVENTS_25]: "25 Events Completed",
    [STAMPS.EVENTS_50]: "50 Events Completed"
};