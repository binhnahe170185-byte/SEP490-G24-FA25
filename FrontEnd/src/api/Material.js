// src/api/Material.js
import { api } from "./http";

// Chuẩn hoá response { code, data }
function unwrap(res) {
  const raw = res?.data || {};
  return raw.data ?? raw;
}

// ===================== MATERIALS =====================

// LIST
export async function getMaterials(params = {}) {
  const { page = 1, pageSize = 10, search = "", subject = "", status = "" } = params;

  // Gửi các tham số filter. Nếu BE dùng tên khác (vd: subjectCode),
  // ta map cả 2 để BE nào hỗ trợ tên nào thì nhận tên đó.
  const q = { page, pageSize, search, status };
  if (subject) {
    q.subject = subject;        // FE filter hiện tại
    q.subjectCode = subject;    // nếu BE nhận subjectCode
    q.subject_id = subject;     // nếu BE nhận subject_id
  }

  const res = await api.get("/api/Materials", { params: q });
  const items = unwrap(res) || [];
  return { items, total: Array.isArray(items) ? items.length : 0 };
}

// DETAIL
export async function getMaterialById(id) {
  const res = await api.get(`/api/Materials/${id}`);
  return unwrap(res) || {};
}

// CREATE
export async function createMaterial(payload) {
  const body = {
    title: payload.materialName,
    materialDescription: payload.description,
    filePath: payload.link || null,
    status: payload.status || "Active",
  };
  const res = await api.post("/api/Materials", body);
  return unwrap(res) || {};
}

// UPDATE
export async function updateMaterial(id, payload) {
  const body = {
    title: payload.materialName,
    materialDescription: payload.description,
    filePath: payload.link || null,
    status: payload.status || "Active",
  };
  const res = await api.put(`/api/Materials/${id}`, body);
  return unwrap(res) || {};
}

// DELETE
export async function deleteMaterial(id) {
  const res = await api.delete(`/api/Materials/${id}`);
  return unwrap(res) || {};
}

// ===================== SUBJECTS =====================

// GET /api/Subjects  -> trả { code, data: [{ code, name } ...] }
export async function getSubjects() {
  const res = await api.get("/api/Subjects");
  const list = unwrap(res) || [];
  // đảm bảo luôn trả mảng [{code, name}]
  return Array.isArray(list) ? list : [];
}
