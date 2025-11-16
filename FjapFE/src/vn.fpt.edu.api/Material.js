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

  const res = await api.get("/api/materials", { params: q });
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
      description: it.description || '',
      // file path
      filePath: it.fileUrl || null,
      // subject
      subjectId: it.subjectId || null,
      subjectCode: it.subjectCode || null,
      subjectName: it.subjectName || null,
      // creator
      createBy: it.createdBy || null,
      createByName: it.creatorName || null,
      creator: it.creatorEmail || it.creatorName || it.createdBy || null,
      // updater (prefer email)
      updatedByEmail: it.updatedByEmail || it.updaterEmail || it.UpdatedByEmail || null,
      updateBy: it.updatedBy || null,
      updateByName: it.updatedByName || null,
      // created/updated dates
      createAt: it.createdAt || null,
      updateAt: it.updatedAt || null,
      createdAt: it.createdAt || null,
      updatedAt: it.updatedAt || null,
      createdDate: it.createdAt || null,
      created: it.createdAt || null,
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
  const res = await api.get(`/api/materials/${id}/detail`);
  return unwrap(res) || {};
}

// CREATE
export async function createMaterial(payload) {
  // Build a payload that matches backend expectations.
  const body = {
    title: payload.title || payload.materialName || payload.name || null,
    description: payload.description || payload.materialDescription || null,
    fileUrl: payload.fileUrl || payload.filePath || payload.link || null,
    subjectId: payload.subjectId || payload.subject || null,
    status: payload.status || 'active',
  };

  // remove undefined/null fields
  const cleanBody = Object.fromEntries(Object.entries(body).filter(([_, v]) => v !== undefined && v !== null));
  const res = await api.post("/api/materials", cleanBody);
  return unwrap(res) || {};
}

// UPDATE
export async function updateMaterial(id, payload) {
  const body = {
    materialId: id,
    title: payload.title || payload.materialName || payload.name || null,
    description: payload.description || payload.materialDescription || null,
    fileUrl: payload.fileUrl || payload.filePath || payload.link || null,
    subjectId: payload.subjectId || payload.subject || null,
    status: payload.status || 'active',
  };
  const cleanBody = Object.fromEntries(Object.entries(body).filter(([_, v]) => v !== undefined && v !== null));
  const res = await api.put(`/api/materials/${id}`, cleanBody);
  return unwrap(res) || {};
}

// DELETE
// Soft-delete: set status to Inactive (so records remain in DB)
export async function deleteMaterial(id) {
  try {
    const res = await api.delete(`/api/materials/${id}`);
    return unwrap(res) || {};
  } catch (err) {
    console.error('deleteMaterial error', err?.response || err);
    throw err;
  }
}

// GET MATERIALS COUNTS BY SUBJECT CODES
// Lấy số lượng materials cho nhiều subjects cùng lúc
export async function getMaterialsCounts(subjectCodes = [], status = "active") {
  try {
    if (!subjectCodes || subjectCodes.length === 0) {
      return {};
    }
    
    const subjectCodesStr = subjectCodes.join(',');
    const res = await api.get("/api/materials/counts", {
      params: {
        subjectCodes: subjectCodesStr,
        status: status
      }
    });
    
    const raw = res?.data?.data || res?.data || {};
    return raw || {};
  } catch (err) {
    console.error('getMaterialsCounts error', err?.response || err);
    return {};
  }
}

// ===================== SUBJECTS =====================


export async function getSubjects() {
  try {
    // Sử dụng endpoint subjectsActive để lấy tất cả subjects active
    const res = await api.get("/api/manager/subjects/subjectsActive");
    const list = unwrap(res) || [];
    console.log('Subjects active API response:', list);
    // đảm bảo luôn trả mảng [{subjectId, subjectCode, subjectName}]
    return Array.isArray(list) ? list : [];
  } catch (error) {
    console.error('Failed to get subjects from subjectsActive endpoint:', error);
    // Fallback về endpoint chính
    try {
      const res = await api.get("/api/manager/subjects");
      const list = unwrap(res) || [];
      console.log('Subjects fallback API response:', list);
      return Array.isArray(list) ? list : [];
    } catch (fallbackError) {
      console.error('Failed to get subjects from fallback endpoint:', fallbackError);
      return [];
    }
  }
}
