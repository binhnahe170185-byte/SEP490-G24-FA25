// Helper functions
export const normalizeString = (s) => (s || '').toString().trim();

export const toNumber = (v) => {
	const n = Number(v);
	return Number.isFinite(n) ? n : null;
};

export const splitSlots = (slotCell) =>
	normalizeString(slotCell)
		.replace(/\s+/g, '')
		.split(',')
		.filter(Boolean)
		.map((s) => toNumber(s))
		.filter((n) => n !== null);

// Split DayOfWeek similar to slots (can be comma-separated)
export const splitDayOfWeek = (dayOfWeekCell) => {
	const normalized = normalizeString(dayOfWeekCell);
	// If it's already a number, return as array
	if (normalized && !normalized.includes(',')) {
		const num = toNumber(normalized);
		return num !== null ? [num] : [];
	}
	// If it contains comma, split it
	return normalized
		.replace(/\s+/g, '')
		.split(',')
		.filter(Boolean)
		.map((s) => toNumber(s))
		.filter((n) => n !== null);
};

// Extract email prefix (part before @)
export const getEmailPrefix = (email) => {
	if (!email) return '';
	const emailStr = normalizeString(email);
	const atIndex = emailStr.indexOf('@');
	return atIndex > 0 ? emailStr.substring(0, atIndex) : emailStr;
};

