import React from "react";
import "../material.css";

export default function Modal({ open, title, onClose, footer, children }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e)=>e.stopPropagation()}>
        <div className="modal-header">
          <span>{title}</span>
          <button className="btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-footer">{footer}</div> : null}
      </div>
    </div>
  );
}
