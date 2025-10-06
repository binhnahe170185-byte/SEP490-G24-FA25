import React, { useEffect, useState } from "react";
import "./StudentList.css";
import { api } from "../../../api/http";

function RenderSquares() {
  return (
    <div style={{ display: "flex", gap: "16px", margin: "16px 0" }}>
      <div style={{ width: 50, height: 50, background: "#007bff" }} />
      <div style={{ width: 50, height: 50, background: "#28a745" }} />
      <div style={{ width: 50, height: 50, background: "#ffc107" }} />
    </div>
  );
}

export default function StudentList() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => {
    let mounted = true;

    api.get("/api/students")
      .then(res => {
        // Hỗ trợ cả 2 kiểu payload: mảng thuần hoặc { data: [...] }
        const payload = res.data;
        const rows = Array.isArray(payload) ? payload : payload?.data;
        if (!Array.isArray(rows)) {
          throw new Error("Payload không phải mảng");
        }
        if (mounted) {
          setStudents(rows);
          setError(null);
        }
      })
      .catch(err => {
        const status = err?.response?.status;
        const body   = err?.response?.data;
        console.error("students error:", status, body || err.message);
        if (mounted) setError(`Không tải được dữ liệu (status ${status ?? "?"})`);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, []);

  if (loading) return <p>Đang tải...</p>;
  if (error)   return <p style={{ color: "crimson" }}>{error}</p>;

  // Mapping cột: nếu BE trả tên khác (vd user_id, first_name, email) thì map lại
  const renderRow = (s) => {
    const id    = s.id ?? s.user_id ?? s.student_id ?? s.Id;
    const name  = s.name ?? s.full_name ?? `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim();
    const email = s.email ?? s.Email;
    return (
      <tr key={id}>
        <td>{id}</td>
        <td>{name}</td>
        <td>{email}</td>
      </tr>
    );
  };

  return (
    <>
      <RenderSquares />
      <table className="student-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Tên</th>
            <th>Email</th>
          </tr>
        </thead>
        <tbody>{students.map(renderRow)}</tbody>
      </table>
    </>
  );
}
