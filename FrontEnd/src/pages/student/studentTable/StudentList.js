import React, { useEffect, useState } from "react";
import "./StudentList.css";
import TableStudent from "../../../api/TableStudent";

function RenderSquares() {
  return (
    <div style={{ display: "flex", gap: "16px", margin: "16px 0" }}>
      <div style={{ width: 50, height: 50, background: "#007bff" }}></div>
      <div style={{ width: 50, height: 50, background: "#28a745" }}></div>
      <div style={{ width: 50, height: 50, background: "#ffc107" }}></div>
    </div>
  );
}

export default function StudentList() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    TableStudent.getAll()
      .then(data => {
        setStudents(data);    
        setLoading(false);
      })
      .catch(err => {
        setError("Lỗi khi lấy dữ liệu");
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Đang tải...</p>;
  if (error) return <p>{error}</p>;

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
    </>
  );
}
