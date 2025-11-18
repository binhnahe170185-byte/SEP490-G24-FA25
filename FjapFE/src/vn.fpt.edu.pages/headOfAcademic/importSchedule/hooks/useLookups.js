import { useState, useEffect } from 'react';
import { message } from 'antd';
import { api } from '../../../../vn.fpt.edu.api/http';
import RoomApi from '../../../../vn.fpt.edu.api/Room';
import TimeslotApi from '../../../../vn.fpt.edu.api/Timeslot';
import SubjectList from '../../../../vn.fpt.edu.api/SubjectList';
import { normalizeString } from '../utils/helpers';

export function useLookups() {
	const [loading, setLoading] = useState(false);
	const [semesters, setSemesters] = useState([]);
	const [classesBySemester, setClassesBySemester] = useState({});
	const [rooms, setRooms] = useState([]); // {value,label}
	const [timeslots, setTimeslots] = useState([]);
	const [lecturers, setLecturers] = useState([]); // [{ lecturerId, lecturerCode }]
	const [subjects, setSubjects] = useState([]); // [{ subjectId, subjectCode, subjectName, levelId }]

	const loadLookups = async () => {
		setLoading(true);
		try {
			// Semesters and classes grouped for schedule
			const scheduleOptions = await api.get('/api/staffAcademic/classes/schedule-options');
			const data = scheduleOptions?.data?.data || scheduleOptions?.data || {};
			setSemesters(data.semesters || []);
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

			// Timeslots
			const ts = await TimeslotApi.getTimeslots();
			setTimeslots(ts || []);

			// Lecturers
			try {
				const lecRes = await api.get('/api/lecturers');
				const lecData = lecRes?.data?.data || lecRes?.data || [];
				setLecturers(
					Array.isArray(lecData)
						? lecData.map((l) => ({
								lecturerId: Number(l.lectureId || l.lecturerId || l.id),
								lecturerCode: normalizeString(l.lecturerCode || l.code),
						  }))
						: []
				);
			} catch (e) {
				console.warn('Load lecturers failed (optional):', e);
				setLecturers([]);
			}

			// Subjects
			try {
				const subjData = await SubjectList.getAllSubjectOptions();
				setSubjects(
					Array.isArray(subjData)
						? subjData.map((s) => ({
								subjectId: Number(s.subjectId || s.id),
								subjectCode: normalizeString(s.subjectCode || s.code),
								subjectName: normalizeString(s.subjectName || s.name),
								levelId: Number(s.levelId || s.level),
						  }))
						: []
				);
			} catch (e) {
				console.warn('Load subjects failed (optional):', e);
				setSubjects([]);
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
		subjects,
		reloadLookups: loadLookups,
	};
}

