/**
 * Conflict checking utilities for CreateSchedule
 * Provides pre-save conflict checking similar to ImportSchedule
 */

/**
 * Generate dates for a pattern in semester
 * @param {number} weekday - Weekday (2=Mon, 3=Tue, ..., 8=Sun)
 * @param {Date} startDate - Semester start date
 * @param {Date} endDate - Semester end date
 * @returns {Date[]} Array of dates matching the weekday pattern
 */
export const generateDatesForPattern = (weekday, startDate, endDate) => {
    // weekday: 2=Mon, 3=Tue, ..., 7=Sat, 8=Sun
    // Convert to JavaScript DayOfWeek: Mon=1, Tue=2, ..., Sat=6, Sun=0
    const targetDayOfWeek = weekday === 8 ? 0 : weekday - 1;

    const dates = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Find first occurrence of target weekday
    const startDayOfWeek = start.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    let daysToAdd = targetDayOfWeek - startDayOfWeek;
    if (daysToAdd < 0) daysToAdd += 7;

    let currentDate = new Date(start);
    currentDate.setDate(start.getDate() + daysToAdd);

    // Generate all dates matching the weekday pattern
    while (currentDate <= end) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 7); // Next week
    }

    return dates;
};

/**
 * Check conflicts with existing schedule before saving
 * @param {Object} payload - Schedule payload
 *   { semesterId, classId, lecturerId, patterns: [{ weekday, timeId, roomId }] }
 * @param {Date} semesterStart - Semester start date
 * @param {Date} semesterEnd - Semester end date
 * @param {Array} holidays - Array of holiday dates (strings in YYYY-MM-DD format)
 * @param {Function} checkAvailability - API function to check availability
 * @param {Function} toYMD - Function to convert Date to YYYY-MM-DD string
 * @param {number} sampleWeeks - Number of weeks to check (default: 4)
 * @returns {Promise<Object>} { hasConflicts: boolean, conflicts: Array }
 */
export const checkConflictsBeforeSave = async (
    payload,
    semesterStart,
    semesterEnd,
    holidays = [],
    checkAvailability,
    toYMD,
    sampleWeeks = 4
) => {
    if (!semesterStart || !semesterEnd || !checkAvailability || !toYMD) {
        console.warn('Missing required parameters for conflict check');
        return { hasConflicts: false, conflicts: [] };
    }

    const conflicts = [];
    const holidaysSet = new Set(holidays.map(h => h.date || h));

    // Check each pattern
    for (const pattern of payload.patterns) {
        // Generate dates for this pattern
        const dates = generateDatesForPattern(
            pattern.weekday,
            semesterStart,
            semesterEnd
        );

        // Filter out holidays
        const validDates = dates.filter(date => {
            const dateStr = toYMD(date);
            return !holidaysSet.has(dateStr);
        });

        // Check first N weeks (sample check to avoid too many API calls)
        const sampleDates = validDates.slice(0, sampleWeeks);

        for (const date of sampleDates) {
            try {
                const dateStr = toYMD(date);
                const response = await checkAvailability({
                    Date: dateStr,
                    TimeId: pattern.timeId,
                    ClassId: payload.classId,
                    RoomId: pattern.roomId,
                    LecturerId: payload.lecturerId,
                });

                // Handle different response formats
                const availability = response?.data?.data || response?.data || response;

                if (availability) {
                    const conflictTypes = [];
                    if (availability.IsClassBusy) conflictTypes.push('Class đã có lịch');
                    if (availability.IsRoomBusy) conflictTypes.push('Room đã được sử dụng');
                    if (availability.IsLecturerBusy) conflictTypes.push('Lecturer đã có lịch');

                    if (conflictTypes.length > 0) {
                        conflicts.push({
                            date: dateStr,
                            weekday: pattern.weekday,
                            timeId: pattern.timeId,
                            roomId: pattern.roomId,
                            types: conflictTypes,
                            className: payload._meta?.className || `Class ${payload.classId}`,
                        });
                    }
                }
            } catch (e) {
                console.warn('Error checking availability:', e);
                // Continue checking other dates even if one fails
            }
        }
    }

    return {
        hasConflicts: conflicts.length > 0,
        conflicts,
    };
};

/**
 * Format conflict message for display
 * @param {Array} conflicts - Array of conflict objects
 * @returns {string} Formatted message
 */
export const formatConflictMessage = (conflicts) => {
    if (!conflicts || conflicts.length === 0) {
        return '';
    }

    const conflictDetails = conflicts
        .map(c => {
            const className = c.className || `Class ${c.classId || ''}`;
            return `${className} (${c.date}): ${c.types.join(', ')}`;
        })
        .join('\n');

    return `Phát hiện ${conflicts.length} conflict(s) với lịch hiện có:\n${conflictDetails}`;
};




