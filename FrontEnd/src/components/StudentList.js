import { useEffect, useState } from "react";
import { getStudents } from "../api/studentApi";

export default function StudentList() {
    const [students, setStudents] = useState([]);
    const [error, setError] = useState("");

    useEffect(() => {
        (async () => {
            try {
                const data = await getStudents();
                setStudents(data);
            } catch (e) {
                console.error("API error:", {
                    status: e.response?.status,
                    url: e.config?.baseURL + e.config?.url,
                    data: e.response?.data
                });
                setError(e.message || "Load failed");
                }

        })();
    }, []);

    if (error) return <p style={{ color: "red" }}>Error: {error}</p>;
    if (!students.length) return <p>No data.</p>;

    return (
        <table border="1" cellPadding="8">
            <thead>
                <tr><th>ID</th><th>Name</th><th>Email</th></tr>
            </thead>
            <tbody>
                {students.map(s => (
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
