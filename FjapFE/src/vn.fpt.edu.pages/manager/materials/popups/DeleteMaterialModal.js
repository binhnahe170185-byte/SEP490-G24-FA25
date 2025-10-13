import React from "react";
import Modal from "../components/Modal";
import { deleteMaterial } from "../../../../vn.fpt.edu.api/Material";

export default function DeleteMaterialModal({ open, id, name, onClose, onDeleted }) {
  async function onConfirm() {
    try { await deleteMaterial(id); onDeleted && onDeleted(); onClose && onClose(); }
    catch { alert("Delete failed"); }
  }
  return (
    <Modal open={open} onClose={onClose} title="Delete Material"
      footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn danger" onClick={onConfirm}>Delete</button></>}>
      Are you sure you want to delete <b>{name || id}</b>? This action cannot be undone.
    </Modal>
  );
}
