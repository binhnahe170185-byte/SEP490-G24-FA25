import React, { useEffect, useState } from "react";
import Modal from "../components/Modal";
import { createMaterial, getSubjects } from "../../../../api/Material";
import "../material.css";

export default function CreateMaterialModal({ open, onClose, onCreated }) {
  const [subjects, setSubjects] = useState([]);
  const [form, setForm] = useState({ materialName:"", subjectCode:"", description:"", link:"", status:"Active" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { if(open) (async()=>setSubjects(await getSubjects()))(); }, [open]);

  async function onSubmit(e) {
    e?.preventDefault();
    setSaving(true);
    try { await createMaterial(form); onCreated && onCreated(); onClose && onClose(); }
    catch { alert("Create failed"); }
    finally { setSaving(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create New Material"
      footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={onSubmit} disabled={saving}>{saving?"Saving...":"Save"}</button></>}>
      <form className="form-grid" onSubmit={onSubmit}>
        <label>Material Name<input value={form.materialName} onChange={e=>setForm({...form, materialName:e.target.value})} required/></label>
        <label>Subject Code
          <select value={form.subjectCode} onChange={e=>setForm({...form, subjectCode:e.target.value})} required>
            <option value="">Select subject</option>{subjects.map(s=><option key={s.code} value={s.code}>{s.code}</option>)}
          </select>
        </label>
        <label style={{gridColumn:"1 / -1"}}>Description<textarea value={form.description} onChange={e=>setForm({...form, description:e.target.value})}/></label>
        <label style={{gridColumn:"1 / -1"}}>Link<input value={form.link} onChange={e=>setForm({...form, link:e.target.value})}/></label>
        <label style={{gridColumn:"1 / -1"}}>Status
          <div className="form-row">
            <label><input type="radio" name="status" value="Active" checked={form.status==="Active"} onChange={()=>setForm({...form, status:"Active"})}/> Active</label>
            <label><input type="radio" name="status" value="Inactive" checked={form.status==="Inactive"} onChange={()=>setForm({...form, status:"Inactive"})}/> Inactive</label>
          </div>
        </label>
      </form>
    </Modal>
  );
}
