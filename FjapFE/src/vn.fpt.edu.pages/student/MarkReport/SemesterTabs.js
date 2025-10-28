import React from "react";

export default function SemesterTabs({ semesters, selectedSemester, onSelectSemester }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
      {semesters.map((semester) => (
        <div
          key={semester.semesterId}
          onClick={() => onSelectSemester(semester)}
          style={{
            padding: "12px 20px",
            backgroundColor:
              selectedSemester?.semesterId === semester.semesterId ? "#1890ff" : "white",
            color: selectedSemester?.semesterId === semester.semesterId ? "white" : "#595959",
            border: "1px solid #d9d9d9",
            borderRadius: 8,
            cursor: "pointer",
            textAlign: "center",
            minWidth: 120,
            fontSize: 14,
            fontWeight: selectedSemester?.semesterId === semester.semesterId ? 600 : 400,
            transition: "all 0.3s",
          }}
        >
          <div style={{ fontWeight: 600 }}>{semester.name}</div>
        </div>
      ))}
    </div>
  );
}