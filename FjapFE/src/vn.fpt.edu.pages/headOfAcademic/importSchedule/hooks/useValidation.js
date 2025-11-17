import { useMemo } from 'react';
import { normalizeString } from '../utils/helpers';

export function useValidation({
	selectedSemesterId,
	classesBySemester,
	rooms,
	timeslots,
	lecturers,
}) {
	// Map helpers
	const classNameToId = useMemo(() => {
		const sid = Number(selectedSemesterId);
		const list = sid ? classesBySemester[sid] || [] : [];
		const map = {};
		list.forEach((c) => {
			map[normalizeString(c.className)] = c.classId;
		});
		return map;
	}, [classesBySemester, selectedSemesterId]);

	const roomNameToId = useMemo(() => {
		const map = {};
		rooms.forEach((r) => {
			map[normalizeString(r.label)] = Number(r.value);
		});
		return map;
	}, [rooms]);

	const slotNumberToTimeId = useMemo(() => {
		const map = {};
		// Timeslots are ordered by StartTime, so index + 1 represents slot number
		timeslots.forEach((t, idx) => {
			const slotNum = idx + 1; // Slot 1, 2, 3, ... based on order
			map[slotNum] = t.timeId;
		});
		return map;
	}, [timeslots]);

	const lecturerCodeToId = useMemo(() => {
		const map = {};
		lecturers.forEach((l) => {
			if (l.lecturerCode) {
				map[normalizeString(l.lecturerCode)] = l.lecturerId;
			}
		});
		return map;
	}, [lecturers]);

	// Function to re-validate and detect conflicts for all rows
	const revalidateRows = useMemo(() => {
		return (rows) => {
			// Debug: Log lookup data availability
			console.log('Validation - Lookup data:', {
				classesCount: Object.keys(classNameToId).length,
				roomsCount: Object.keys(roomNameToId).length,
				timeslotsCount: Object.keys(slotNumberToTimeId).length,
				lecturersCount: Object.keys(lecturerCodeToId).length,
				slotNumberToTimeIdMap: slotNumberToTimeId,
			});
			
			// Detect duplicates
			const keyCount = {};
			rows.forEach((r) => {
				const key = [
					normalizeString(r.className),
					r.dayOfWeek,
					r.slot,
					normalizeString(r.roomName),
				].join('|');
				keyCount[key] = (keyCount[key] || 0) + 1;
			});

			// Re-validate each row
			return rows.map((r) => {
				const normalizedClassName = normalizeString(r.className);
				const normalizedRoomName = normalizeString(r.roomName);
				const normalizedLecturer = normalizeString(r.lecturer);
				
				const classId = classNameToId[normalizedClassName];
				const roomId = roomNameToId[normalizedRoomName];
				const timeId = r.slot != null ? slotNumberToTimeId[r.slot] : undefined;
				const lecturerId = lecturerCodeToId[normalizedLecturer];
				
				const duplicateInFile =
					keyCount[
						[
							normalizedClassName,
							r.dayOfWeek,
							r.slot,
							normalizedRoomName,
						].join('|')
					] > 1;
				
				// Debug missing mappings
				const missingFields = [];
				if (!classId) missingFields.push(`Class: "${normalizedClassName}"`);
				if (!roomId) missingFields.push(`Room: "${normalizedRoomName}"`);
				if (!timeId && r.slot != null) missingFields.push(`Slot: ${r.slot}`);
				if (!r.dayOfWeek) missingFields.push(`DayOfWeek: ${r.dayOfWeek}`);
				if (!lecturerId) missingFields.push(`Lecturer: "${normalizedLecturer}"`);
				
				if (missingFields.length > 0) {
					console.log(`Row missing mappings: ${missingFields.join(', ')}`);
				}
				
				return {
					...r,
					classId,
					roomId,
					timeId,
					lecturerId,
					validMapping:
						Boolean(classId) &&
						Boolean(roomId) &&
						Boolean(timeId) &&
						Boolean(r.dayOfWeek) &&
						Boolean(lecturerId),
					duplicateInFile,
				};
			});
		};
	}, [classNameToId, roomNameToId, slotNumberToTimeId, lecturerCodeToId]);

	return {
		classNameToId,
		roomNameToId,
		slotNumberToTimeId,
		lecturerCodeToId,
		revalidateRows,
	};
}

