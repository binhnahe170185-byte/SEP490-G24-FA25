
export const filterSemestersForCreate = (allSemesters) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison

    // Find current semester (semester that contains today)
    const currentSemester = allSemesters.find(sem => {
        if (!sem.startDate || !sem.endDate) return false;
        const startDateObj = new Date(sem.startDate);
        const endDateObj = new Date(sem.endDate);
        startDateObj.setHours(0, 0, 0, 0);
        endDateObj.setHours(23, 59, 59, 999); // End of day
        return today >= startDateObj && today <= endDateObj;
    });

    // Filter: only show semesters with startDate after current semester's endDate
    // If no current semester found, show semesters with startDate after today
    return allSemesters.filter(sem => {
        if (!sem.startDate) return false; // Exclude semesters without startDate

        const startDateObj = new Date(sem.startDate);
        startDateObj.setHours(0, 0, 0, 0);

        if (currentSemester && currentSemester.endDate) {
            const currentEndDate = new Date(currentSemester.endDate);
            currentEndDate.setHours(23, 59, 59, 999);
            return startDateObj > currentEndDate;
        } else {
            return startDateObj > today;
        }
    });
};


export const filterSemestersForEdit = (allSemesters) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison

    // Filter: show semesters that are current or future (endDate >= today)
    return allSemesters.filter(sem => {
        if (!sem.endDate) return false; // Exclude semesters without endDate
        const endDateObj = new Date(sem.endDate);
        endDateObj.setHours(0, 0, 0, 0);
        return endDateObj >= today;
    });
};






