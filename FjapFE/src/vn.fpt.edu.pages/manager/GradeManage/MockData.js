// Dữ liệu giả lập, mô phỏng cấu trúc database của bạn

export const SEMESTERS = [
    { semester_id: 1, name: "Summer 2025", start_date: "2025-05-01", end_date: "2025-08-31" },
    { semester_id: 2, name: "Fall 2025", start_date: "2025-09-01", end_date: "2025-12-31" },
];

export const SUBJECTS = [
    { subject_id: 101, subject_code: "HCM202", subject_name: "Ho Chi Minh Ideology", pass_mark: 5.0 },
    { subject_id: 102, subject_code: "PRJ301", subject_name: "Java Web Application", pass_mark: 5.0 },
    { subject_id: 103, subject_code: "DBI202", subject_name: "Database Systems", pass_mark: 5.0 },
];

export const CLASSES = [
    { class_id: 1, class_name: "MKT1718-DIG", semester_id: 1, subject_id: 101 },
    { class_id: 2, class_name: "SE1701", semester_id: 1, subject_id: 102 },
    { class_id: 3, class_name: "SE1702", semester_id: 2, subject_id: 102 },
    { class_id: 4, class_name: "SE1701", semester_id: 2, subject_id: 103 },
];

export const ENROLLMENTS = [
    ...Array.from({ length: 25 }, (_, i) => ({ student_id: i + 1, class_id: 1 })),
    ...Array.from({ length: 30 }, (_, i) => ({ student_id: i + 1, class_id: 2 })),
    ...Array.from({ length: 28 }, (_, i) => ({ student_id: i + 20, class_id: 3 })),
    ...Array.from({ length: 22 }, (_, i) => ({ student_id: i + 15, class_id: 4 })),
];

export const GRADES = [
    ...Array.from({ length: 23 }, (_, i) => ({ student_id: i + 1, subject_id: 101, final_score: (Math.random() * 6 + 4).toFixed(1) })),
    ...Array.from({ length: 30 }, (_, i) => ({ student_id: i + 25, subject_id: 102, final_score: (Math.random() * 5 + 5).toFixed(1) })),
    ...Array.from({ length: 15 }, (_, i) => ({ student_id: i + 20, subject_id: 102, final_score: (Math.random() * 7 + 3).toFixed(1) })),
];
