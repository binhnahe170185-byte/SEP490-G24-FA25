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
  const { search = "", subject = "", status = "" } = params;

  const q = { search, subject, status };

  const res = await api.get("/api/Materials", { params: q });
  const raw = unwrap(res) || [];
  let items = [];
  if (Array.isArray(raw)) {
    items = raw;
  } else if (Array.isArray(raw.items)) {
    items = raw.items;
  } else if (Array.isArray(raw.data)) {
    items = raw.data;
  } else {
    items = [];
  }

  // Normalize item shape so frontend can rely on stable keys.
  const normalized = (items || []).map((it) => {
    return {
      // id used by table rowKey; prefer numeric id fields
      id: it.materialId || it.id || null,
      materialId: it.materialId || it.id || null,
      // title / name
      title: it.title || '',
      // description
      description: it.materialDescription || '',
      // file path
      filePath: it.filePath || null,
      // subject
      subjectId: it.subjectId || null,
      subjectCode: it.subjectCode || null,
      subjectName: it.subjectName || null,
      // creator
      createBy: it.createBy || null,
      createByName: it.createByName || null,
      creator: it.creatorName || it.createByName || it.createBy || null,
      updateBy: it.updateBy || null,
      updateByName: it.updateByName || null,
      // created/updated dates
      createAt: it.createAt || null,
      updateAt: it.updateAt || null,
      createdDate: it.createAt || null,
      created: it.createAt || null,
      // status
      status: (it.status || '').toString(),
      // pass through original for anything else
      __raw: it,
    };
  });

  return { items: normalized, total: Array.isArray(normalized) ? normalized.length : 0 };
}

// DETAIL
export async function getMaterialById(id) {
  const res = await api.get(`/api/Materials/${id}/detail`);
  return unwrap(res) || {};
}

// CREATE
export async function createMaterial(payload) {
  // Build a payload that matches backend expectations.
  const body = {
    title: payload.title || payload.materialName || payload.name || null,
    materialDescription: payload.materialDescription || payload.description || null,
    filePath: payload.filePath || payload.link || null,
    subjectId: payload.subjectId || payload.subject || null,
    status: payload.status || 'Active',
  };

  // remove undefined/null fields
  const cleanBody = Object.fromEntries(Object.entries(body).filter(([_, v]) => v !== undefined && v !== null));
  const res = await api.post("/api/Materials", cleanBody);
  return unwrap(res) || {};
}

// UPDATE
export async function updateMaterial(id, payload) {
  const body = {
    materialId: id,
    title: payload.title || payload.materialName || payload.name || null,
    materialDescription: payload.materialDescription || payload.description || null,
    filePath: payload.filePath || payload.link || null,
    subjectId: payload.subjectId || payload.subject || null,
    status: payload.status || 'Active',
  };
  const cleanBody = Object.fromEntries(Object.entries(body).filter(([_, v]) => v !== undefined && v !== null));
  const res = await api.put(`/api/Materials/${id}`, cleanBody);
  return unwrap(res) || {};
}

// DELETE
// Soft-delete: set status to Inactive (so records remain in DB)
export async function deleteMaterial(id) {
  try {
    const res = await api.delete(`/api/Materials/${id}`);
    return unwrap(res) || {};
  } catch (err) {
    console.error('deleteMaterial error', err?.response || err);
    throw err;
  }
}

// ===================== SUBJECTS =====================


export async function getSubjects() {
  const res = await api.get("api/Subjects");
  const list = unwrap(res) || [];
  // đảm bảo luôn trả mảng [{subjectId, subjectCode, subjectName}]
  return Array.isArray(list) ? list : [];
}
