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
  // Normalise various possible response shapes from the backend.
  // Backend might return an array directly, or an object like { items: [...], total }
  const raw = unwrap(res) || [];
  let items = [];
  if (Array.isArray(raw)) {
    items = raw;
  } else if (Array.isArray(raw.items)) {
    items = raw.items;
  } else if (Array.isArray(raw.data)) {
    items = raw.data;
  } else {
    // fallback: try common fields or empty
    items = [];
  }

  // Normalize item shape so frontend can rely on stable keys.
  const normalized = (items || []).map((it) => {
    return {
      // id used by table rowKey; prefer numeric id fields
      id: it.id || it.material_id || it.materialId || null,
      materialId: it.material_id || it.materialId || it.id || null,
      // title / name
      title: it.title || it.materialName || it.name || '',
      // description
      description: it.materialDescription || it.description || it.desc || '',
      // link / file path
      link: it.filePath || it.file_url || it.fileUrl || it.link || null,
      // subject - keep both possible keys
      subject: it.subject || it.subject_id || it.subjectId || null,
      subjectCode: it.subjectCode || it.subject_code || it.subjectCode || null,
      // creator (may be id or object depending on BE)
      creator: (it.created_by && (typeof it.created_by === 'string' || typeof it.created_by === 'number')) ? it.created_by : (it.created_by_name || it.creator || it.createdBy || null),
      // created/updated dates
      createdDate: it.created_at || it.createdAt || it.created_date || null,
      updatedDate: it.updated_at || it.updatedAt || it.updated_date || null,
      // status
      status: (it.status || it.statusName || it.status_name || '').toString(),
      // pass through original for anything else
      __raw: it,
    };
  });

  return { items: normalized, total: Array.isArray(normalized) ? normalized.length : 0 };
}

// DETAIL
export async function getMaterialById(id) {
  const res = await api.get(`/api/Materials/${id}`);
  return unwrap(res) || {};
}

// CREATE
export async function createMaterial(payload) {
  // Build a payload that matches various BE expectations.
  const body = {
    title: payload.materialName || payload.title || null,
    // backend may expect `description` or `materialDescription`
    description: payload.description || payload.materialDescription || null,
    materialDescription: payload.materialDescription || payload.description || null,
    // backend may expect `fileUrl` or `filePath`
    fileUrl: payload.link || payload.fileUrl || payload.filePath || null,
    filePath: payload.filePath || payload.link || payload.fileUrl || null,
    // include subjectId if provided (required on some backends)
    subjectId: payload.subjectId || payload.subject || payload.subject_id || null,
    // normalize status to backend enum (use lowercase 'active'/'inActive' by default)
    status: (payload.status || 'active').toString(),
  };

  // remove undefined/null fields
  const cleanBody = Object.fromEntries(Object.entries(body).filter(([_, v]) => v !== undefined && v !== null));
  const res = await api.post("/api/Materials", cleanBody);
  return unwrap(res) || {};
}

// UPDATE
export async function updateMaterial(id, payload) {
  const body = {
    title: payload.materialName || payload.title || null,
    description: payload.description || payload.materialDescription || null,
    materialDescription: payload.materialDescription || payload.description || null,
    fileUrl: payload.link || payload.fileUrl || payload.filePath || null,
    filePath: payload.filePath || payload.link || payload.fileUrl || null,
    subjectId: payload.subjectId || payload.subject || payload.subject_id || null,
    status: (payload.status || 'active').toString(),
  };
  const cleanBody = Object.fromEntries(Object.entries(body).filter(([_, v]) => v !== undefined && v !== null));
  const res = await api.put(`/api/Materials/${id}`, cleanBody);
  return unwrap(res) || {};
}

// DELETE
// Soft-delete: set status to inActive (so records remain in DB)
export async function deleteMaterial(id) {
  // Soft-delete: fetch the existing material and send a full update payload
  // because some backends validate required fields on PUT.
  try {
    const existing = await getMaterialById(id);
    // Prefer using the raw backend keys if available to avoid validation errors.
    const src = existing.__raw && Object.keys(existing.__raw).length ? existing.__raw : existing;

    // Build a minimal, explicit payload to reduce server-side model binding errors.
    // Include the common fields the backend typically requires.
    const minimal = {
      id: id,
      materialId: id,
      title: src.title || src.name || src.materialName || null,
      description: src.description || src.materialDescription || null,
      fileUrl: src.fileUrl || src.file_url || src.filePath || src.file_path || null,
      filePath: src.filePath || src.file_path || src.fileUrl || src.file_url || null,
      subjectId: src.subjectId || src.subject_id || (src.subject && (src.subject.id || src.subjectId)) || null,
      status: 'inActive',
    };

    // Remove nulls to avoid sending unnecessary null fields
    const payload = Object.fromEntries(Object.entries(minimal).filter(([_, v]) => v !== null && v !== undefined));

    console.debug('Existing raw material from GET:', src);
    console.debug('Sending minimal soft-delete payload for material', id, payload);

    try {
      const res = await api.put(`/api/Materials/${id}`, payload);
      console.debug('Soft-delete response', res?.data);
      return unwrap(res) || {};
    } catch (err) {
      console.error('Soft-delete request failed', err?.response?.data || err?.message || err);
      throw err;
    }
  } catch (err) {
    console.error('deleteMaterial error', err?.response || err);
    // rethrow so caller can handle/display error
    throw err;
  }
}

// ===================== SUBJECTS =====================


export async function getSubjects() {
  const res = await api.get("api/manager/subjects");
  const list = unwrap(res) || [];
  // đảm bảo luôn trả mảng [{code, name}]
  return Array.isArray(list) ? list : [];
}
