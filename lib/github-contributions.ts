import { HeatmapData } from "@/components/ui/heatmap";

/**
 * Generate contribution data for Harsh Pandhe's 2025 GitHub activity.
 * Based on profile: 817+ contributions, 76+ repos, active throughout the year
 * with peak activity around SIH (Dec), Project Morpheus (Jan-Feb), RoboRashtra (Jan-Feb),
 * and consistent open-source contributions.
 */

// Deterministic seeded random for reproducibility
function seededRandom(seed: number) {
    let s = seed;
    return () => {
        s = (s * 16807 + 0) % 2147483647;
        return (s - 1) / 2147483646;
    };
}

export function generateContributionData(): HeatmapData {
    const data: HeatmapData = [];
    const rand = seededRandom(42);

    const startDate = new Date("2025-01-01");
    const endDate = new Date("2025-12-31");

    // Define activity intensity by month (0-1 scale)
    // Jan: moderate (semester start, hackathon prep)
    // Feb-Mar: active (post-hackathons, semester)
    // Apr: moderate (PCU Ideathon, exams)
    // May-Jun: lower (break, but still building)
    // Jul: moderate (portfolio, learning)
    // Aug: lower (mentioned "zero opportunities" feeling)
    // Sep-Oct: rising (IIC role, hackathons - HackChrono, Ctrl Space, Infotsav)
    // Nov: very active (Project Morpheus dev, Kalpataru)
    // Dec: peak (SIH 2025 finals & win, platform deployments)
    const monthIntensity: Record<number, number> = {
        0: 0.55, // Jan
        1: 0.6,  // Feb
        2: 0.5,  // Mar
        3: 0.55, // Apr
        4: 0.35, // May
        5: 0.4,  // Jun
        6: 0.5,  // Jul
        7: 0.35, // Aug
        8: 0.65, // Sep
        9: 0.75, // Oct
        10: 0.85, // Nov
        11: 0.95, // Dec
    };

    // Special high-activity periods (date ranges with boosted contributions)
    const highActivityPeriods = [
        // SIH 2025 prep & finals (late Nov - Dec)
        { start: "2025-11-15", end: "2025-12-25", boost: 1.8 },
        // Project Morpheus platform build (Nov-Dec)
        { start: "2025-11-01", end: "2025-12-15", boost: 1.4 },
        // Kalpataru platform (Oct-Nov)
        { start: "2025-10-15", end: "2025-11-20", boost: 1.3 },
        // HackChrono, Ctrl Space, Infotsav hackathons (Oct)
        { start: "2025-10-01", end: "2025-10-25", boost: 1.5 },
        // PCU Ideathon (Apr)
        { start: "2025-04-10", end: "2025-04-20", boost: 1.6 },
        // E-Commerce Store build (Oct-Nov 2024 but continued Jan 2025)
        { start: "2025-01-05", end: "2025-01-25", boost: 1.3 },
        // Codex development burst (Jan-Feb)
        { start: "2025-01-10", end: "2025-02-15", boost: 1.2 },
        // Research paper writing (Jan)
        { start: "2025-01-20", end: "2025-02-05", boost: 1.1 },
        // RoboRashtra 2026 bot coding marathon (late Jan 2026 is outside range, reflect prep)
        { start: "2025-12-20", end: "2025-12-31", boost: 1.6 },
    ];

    let totalContributions = 0;
    const rawData: { date: string; value: number }[] = [];

    const curr = new Date(startDate);
    while (curr <= endDate) {
        const dateStr = formatDate(curr);
        const month = curr.getMonth();
        const dayOfWeek = curr.getDay();

        // Base probability of contributing
        let intensity = monthIntensity[month];

        // Weekdays are more active than weekends
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            intensity *= 0.6;
        }

        // Apply boosts from high-activity periods
        for (const period of highActivityPeriods) {
            if (dateStr >= period.start && dateStr <= period.end) {
                intensity *= period.boost;
            }
        }

        // Clamp intensity
        intensity = Math.min(intensity, 1.0);

        // Determine if there's any contribution today
        const r = rand();
        let value = 0;

        if (r < intensity) {
            // Contribution count: weighted toward lower values with occasional spikes
            const r2 = rand();
            if (r2 < 0.3) {
                value = Math.floor(rand() * 3) + 1; // 1-3
            } else if (r2 < 0.65) {
                value = Math.floor(rand() * 5) + 2; // 2-6
            } else if (r2 < 0.85) {
                value = Math.floor(rand() * 6) + 5; // 5-10
            } else if (r2 < 0.95) {
                value = Math.floor(rand() * 8) + 8; // 8-15
            } else {
                value = Math.floor(rand() * 10) + 12; // 12-21 (intense days)
            }
        }

        rawData.push({ date: dateStr, value });
        totalContributions += value;

        curr.setDate(curr.getDate() + 1);
    }

    // Scale to roughly match ~817 contributions
    const targetTotal = 817;
    const scale = targetTotal / totalContributions;

    for (const entry of rawData) {
        const scaledValue = Math.round(entry.value * scale);
        if (scaledValue > 0) {
            data.push({ date: entry.date, value: scaledValue });
        }
    }

    return data;
}

function formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}
