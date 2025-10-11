import React, { useEffect, useState } from "react";
import Modal from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import { getMaterialById } from "../../../../api/Material";
import "../material.css";

export default function DetailMaterialModal({ open, id, onClose }) {
  const [data, setData] = useState(null);
  useEffect(() => { if(open && id) (async()=>setData(await getMaterialById(id)))(); }, [open, id]);

  return (
    <Modal open={open} onClose={onClose} title={`Detail Material ${id}`}>
      {!data ? "Loading..." : (
        <div className="form-grid" style={{gridTemplateColumns:"1fr 1fr"}}>
          <div><b>Material Name</b><div>{data.materialName}</div></div>
          <div><b>Creator</b><div>{data.creator}</div></div>
          <div><b>Subject Code</b><div>{data.subjectCode}</div></div>
          <div><b>Status</b><div><StatusBadge status={data.status}/></div></div>
          <div><b>Updated Date</b><div>{(data.updatedDate||"").slice(0,10)}</div></div>
          <div><b>Created Date</b><div>{(data.createdDate||"").slice(0,10)}</div></div>
          <div style={{gridColumn:"1/-1"}}><b>Link</b><div><a href={data.link} target="_blank" rel="noreferrer">Open in Drive</a></div></div>
          <div style={{gridColumn:"1/-1"}}><b>Description</b><div><textarea readOnly value={data.description||""} /></div></div>
        </div>
      )}
    </Modal>
  );
}
