import React, { useEffect, useState } from "react";
import Modal from "../components/Modal";
import { getMaterialById, updateMaterial, getSubjects } from "../../../../vn.fpt.edu.api/Material";
import "../material.css";

export default function EditMaterialModal({ open, id, onClose, onUpdated }) {
  const [subjects, setSubjects] = useState([]);
  const [form, setForm] = useState({ materialName:"", subjectCode:"", description:"", link:"", status:"Active" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if(!open || !id) return;
    (async () => {
      setLoading(true);
      try {
        setSubjects(await getSubjects());
        const data = await getMaterialById(id);
        setForm({
          materialName: data.materialName || "",
          subjectCode: data.subjectCode || "",
          description: data.description || "",
          link: data.link || "",
          status: data.status || "Active",
        });
      } finally { setLoading(false); }
    })();
  }, [open, id]);

  async function onSubmit(e) {
    e?.preventDefault();
    setSaving(true);
    try { await updateMaterial(id, form); onUpdated && onUpdated(); onClose && onClose(); }
    catch { alert("Update failed"); }
    finally { setSaving(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Material"
      footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={onSubmit} disabled={saving}>{saving?"Updating...":"Update"}</button></>}>
      {loading ? "Loading..." : (
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
      )}
    </Modal>
  );
}
