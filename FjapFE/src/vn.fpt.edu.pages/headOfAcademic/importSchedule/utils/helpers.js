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

