import { useState, useEffect } from 'react';
import { message } from 'antd';
import { api } from '../../../../vn.fpt.edu.api/http';
import RoomApi from '../../../../vn.fpt.edu.api/Room';
import TimeslotApi from '../../../../vn.fpt.edu.api/Timeslot';
import { normalizeString, getEmailPrefix } from '../utils/helpers';

export function useLookups() {
	const [loading, setLoading] = useState(false);
	const [semesters, setSemesters] = useState([]);
	const [classesBySemester, setClassesBySemester] = useState({});
	const [rooms, setRooms] = useState([]); // {value,label}
	const [timeslots, setTimeslots] = useState([]);
	const [lecturers, setLecturers] = useState([]); // [{ lecturerId, lecturerCode }]

	const loadLookups = async () => {
		setLoading(true);
		try {
			// Semesters and classes grouped for schedule
			const scheduleOptions = await api.get('/api/staffAcademic/classes/schedule-options');
			const data = scheduleOptions?.data?.data || scheduleOptions?.data || {};
			const allSemesters = data.semesters || [];

			// Filter semesters to only show future semesters (after current semester)
			const today = new Date();
			today.setHours(0, 0, 0, 0); // Reset time to start of day

			// Find current semester (semester that contains today)
			const currentSemester = allSemesters.find((s) => {
				const startDate = new Date(s.startDate);
				const endDate = new Date(s.endDate);
				startDate.setHours(0, 0, 0, 0);
				endDate.setHours(23, 59, 59, 999); // End of day
				return today >= startDate && today <= endDate;
			});

			// Filter: only show semesters with startDate after current semester's endDate
			// If no current semester found, show semesters with startDate after today
			const filteredSemesters = allSemesters.filter((s) => {
				const startDate = new Date(s.startDate);
				startDate.setHours(0, 0, 0, 0);

				if (currentSemester) {
					const currentEndDate = new Date(currentSemester.endDate);
					currentEndDate.setHours(23, 59, 59, 999);
					return startDate > currentEndDate;
				} else {
					return startDate > today;
				}
			});

			setSemesters(filteredSemesters);
			// classesBySemester already contains totalLesson from API
			setClassesBySemester(data.classesBySemester || {});

			// Rooms
			const roomRes = await RoomApi.getRooms({ pageSize: 500 });
			const roomItems = roomRes.items || [];
			setRooms(
				roomItems.map((r) => ({
					value: String(r.roomId),
					label: r.roomName,
				}))
			);

			// Timeslots - Sort by StartTime to ensure correct slot numbering
			const ts = await TimeslotApi.getTimeslots();
			const sortedTimeslots = (ts || []).sort((a, b) => {
				// Compare StartTime strings (format: "HH:mm" or "HH:mm:ss")
				const timeA = a.startTime || '';
				const timeB = b.startTime || '';
				return timeA.localeCompare(timeB);
			});
			setTimeslots(sortedTimeslots);

			// Lecturers
			try {
				const lecRes = await api.get('/api/lecturers');
				const lecData = lecRes?.data?.data || lecRes?.data || [];
				setLecturers(
					Array.isArray(lecData)
						? lecData.map((l) => {
							const email = normalizeString(l.email || l.Email || '');
							const emailPrefix = getEmailPrefix(email);
							return {
								lecturerId: Number(l.lectureId || l.lecturerId || l.id || l.LecturerId),
								lecturerCode: normalizeString(l.lecturerCode || l.code || l.LecturerCode),
								email: email,
								emailPrefix: emailPrefix, // Part before @ for display and mapping
							};
						})
						: []
				);
			} catch (e) {
				console.warn('Load lecturers failed (optional):', e);
				setLecturers([]);
			}
		} catch (e) {
			console.error('Lookup load failed:', e);
			message.error('Failed to load options');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadLookups();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return {
		loading,
		semesters,
		classesBySemester,
		rooms,
		timeslots,
		lecturers,
		reloadLookups: loadLookups,
	};
}

