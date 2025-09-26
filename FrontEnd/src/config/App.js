import React from "react";
import StudentTable from "../components/student/studentTable/StudentList";

export default function App() {
  return (
    <div style={{ padding: 20 }}>
      <h1>Danh sách sinh viên</h1>
      <StudentTable />
    </div>
  );
}
