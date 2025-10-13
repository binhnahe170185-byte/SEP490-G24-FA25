import React, { useEffect, useState, useCallback } from "react";
import "./StudentList.css";
import { api } from "../../../vn.fpt.edu.api/http";

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

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/api/students");
      // BE trả { code, data: [...] }
      const rows = Array.isArray(res?.data?.data) ? res.data.data : [];
      setStudents(rows);
    } catch (err) {
      const status = err?.response?.status;
      const body   = err?.response?.data;
      console.error("GET /api/students failed:", status, body || err.message);
      setError(`Không tải được dữ liệu (status ${status ?? "?"})`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  if (loading) return <p>Đang tải...</p>;

  if (error) {
    return (
      <div>
        <p style={{ color: "crimson", marginBottom: 8 }}>{error}</p>
        <button onClick={fetchStudents}>Thử lại</button>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <RenderSquares />
        <button onClick={fetchStudents}>Refresh</button>
      </div>

      <table className="student-table">
        <thead>
          <tr>
            <th style={{ width: 90 }}>Student ID</th>
            <th style={{ width: 140 }}>Student Code</th>
            <th style={{ width: 100 }}>Status</th>
            <th style={{ width: 90 }}>User ID</th>
            <th style={{ width: 90 }}>Level ID</th>
            <th style={{ width: 150 }}>Attendances (count)</th>
          </tr>
        </thead>
        <tbody>
          {students.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ textAlign: "center", padding: 16 }}>
                Không có dữ liệu
              </td>
            </tr>
          ) : (
            students.map((s) => (
              <tr key={s.studentId}>
                <td>{s.studentId}</td>
                <td>{s.studentCode}</td>
                <td>{s.status}</td>
                <td>{s.userId}</td>
                <td>{s.levelId}</td>
                <td>{Array.isArray(s.attendances) ? s.attendances.length : 0}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </>
  );
}
