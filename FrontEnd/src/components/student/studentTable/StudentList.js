import { useEffect, useState } from "react";
import http from "../../../api/http";   // chỉ cần file http.js thôi
import "./studentList.css";

export default function StudentTable() {
    const [students, setStudents] = useState([]);
    const [loading,       setLoading] = useState(true);
    const [error, setError] = useState(null);

    // gọi API trực tiếp trong useEffect
    useEffect(() => {
        (async () => {
            try {
                const res = await http.get("/api/students"); // gọi backend
                setStudents(res.data);
            } catch (e) {
                setError("Lỗi khi tải dữ liệu sinh viên");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    if (loading) return <p>Đang tải...</p>;
    if (error) return <p>{error}</p>;
    return (
        <table className="student-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Tên</th>
                    <th>Email</th>
                </tr>
            </thead>
            <tbody>
                {students.map((s) => (
                    <tr key={s.id}>
                        <td>{s.id}</td>
                        <td>{s.name}</td>
                        <td>{s.email}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
