import React from "react";
import StatusBadge from "./StatusBadge";

export default function MaterialTable({ rows, loading, onView, onEdit, onDelete }) {
  return (
    <div className="mtl-card">
      <table className="mtl-table">
        <thead>
          <tr>
            <th>Material ID</th><th>Material Name</th><th>Subject Code</th><th>Creator</th>
            <th>Created Date</th><th>Updated Date</th><th>Status</th><th style={{width:140}}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading && <tr><td colSpan={8} className="mtl-empty">Loading…</td></tr>}
          {!loading && rows.length===0 && <tr><td colSpan={8} className="mtl-empty">No data</td></tr>}
          {!loading && rows.map(r => (
            <tr key={r.id || r.materialId}>
              <td>{r.materialId || r.id}</td>
              <td>{r.title}</td>
              <td>{r.subjectCode}</td>
              <td>{r.createBy}</td>
              <td>{(r.createAt||r.createdAt||"").slice(0,10)}</td>
              <td>{(r.updateAt||r.updatedAt||"").slice(0,10)}</td>
              <td><StatusBadge status={r.status} /></td>
              <td className="mtl-actions">
                <button className="icon-btn" onClick={()=>onView(r)}>View</button>
                <button className="icon-btn" onClick={()=>onEdit(r)}>Edit</button>
                <button className="icon-btn danger" onClick={()=>onDelete(r)}>Del</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
