import React from "react";
export default function FilterBar({ search, onSearch, subject, onSubject, status, onStatus, subjects, onAdd }) {
  return (
    <div className="mtl-toolbar">
      <input className="mtl-search" placeholder="Search materials..." value={search} onChange={(e)=>onSearch(e.target.value)} />
      <select className="mtl-select" value={subject} onChange={(e)=>onSubject(e.target.value)}>
        <option value="">All Subjects</option>
        {subjects.map(s => <option key={s.code} value={s.code}>{s.code}{s.name?` - ${s.name}`:""}</option>)}
      </select>
      <select className="mtl-select" value={status} onChange={(e)=>onStatus(e.target.value)}>
        <option value="">All Statuses</option>
        <option>Active</option><option>Inactive</option>
      </select>
      <button className="mtl-primary" onClick={onAdd}>+ Add Material</button>
    </div>
  );
}
