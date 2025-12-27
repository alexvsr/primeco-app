/**
 * Configuration des créneaux d'arrivée par buvette
 * Basé sur le fichier Hotelis.xlsx - FEUILLES HEURES
 */

export const BUVETTE_SCHEDULES: Record<string, string[]> = {
    // Hockey - GSHC
    "Buvette 1": ["17:30", "18:00", "18:30", "19:00"],
    "Buvette 2": ["17:30", "18:00", "18:30", "19:00"],
    "Buvette 3": ["17:30", "18:00", "18:30", "19:00"],
    "Food Genevois": ["17:30", "18:00"],
    "Food Bretzel": ["18:00", "19:00"],
    "Chalet 1": ["17:30", "17:30", "18:00"],
    "Chalet 2": ["17:30", "17:30"],
    "Chalet 3": ["17:30", "17:30", "18:00"],
    "Cocktail": ["17:30", "18:00"],
    "Home Corner": ["17:30", "18:30", "19:00"],
    "Visiteur": ["17:30", "18:00", "18:30"],

    // Football - SFC (default times based on typical match schedule)
    "Tribune Nord": ["16:30", "17:00", "17:30", "18:00"],
    "Tribune Sud": ["16:30", "17:00", "17:30", "18:00"],
    "VIP Lounge": ["16:00", "16:30", "17:00"],
    "Buvette Extérieure": ["16:30", "17:00", "17:30"],
    "Esplanade": ["16:30", "17:00", "17:30", "18:00"],
};

/**
 * Get arrival time for a specific slot in a buvette
 * @param buvetteName Name of the buvette
 * @param slotIndex 0-based index of the slot
 * @returns Arrival time string (e.g., "17:30") or null if no slot available
 */
export function getArrivalTimeForSlot(buvetteName: string, slotIndex: number): string | null {
    const schedule = BUVETTE_SCHEDULES[buvetteName];

    if (!schedule) {
        // Default schedule for unknown buvettes
        const defaultSchedule = ["17:30", "18:00", "18:30", "19:00"];
        return slotIndex < defaultSchedule.length ? defaultSchedule[slotIndex] : null;
    }

    return slotIndex < schedule.length ? schedule[slotIndex] : null;
}

/**
 * Get max staff capacity for a buvette based on schedule slots
 */
export function getMaxStaffForBuvette(buvetteName: string): number {
    const schedule = BUVETTE_SCHEDULES[buvetteName];
    return schedule ? schedule.length : 4; // Default to 4 if not configured
}
