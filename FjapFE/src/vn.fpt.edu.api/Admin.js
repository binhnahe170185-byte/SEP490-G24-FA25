import { api } from "./http";

// lọc param rỗng
const clean = (o = {}) =>
  Object.fromEntries(
    Object.entries(o).filter(([_, v]) => v !== undefined && v !== null && v !== "")
  );

// unwrap các dạng {code:200,data:{...}} | {data:{...}} | {...}
const unwrap = (res) => res?.data?.data ?? res?.data ?? res;

// trả { total, items }
const extractPaged = (body) => {
  console.log("extractPaged - Input body:", body, "Type:", typeof body);
  console.log("extractPaged - Body JSON:", JSON.stringify(body, null, 2));
  
  // Handle empty/null/undefined
  if (!body || body === "" || body === null || body === undefined) {
    console.log("extractPaged - Body is empty/null/undefined");
    return { total: 0, items: [] };
  }
  
  // Handle string (shouldn't happen but just in case)
  if (typeof body === "string") {
    console.log("extractPaged - Body is string, trying to parse");
    try {
      const parsed = JSON.parse(body);
      return extractPaged(parsed);
    } catch {
      return { total: 0, items: [] };
    }
  }
  
  // Case 1: Direct format { total, items }
  if (body?.total !== undefined && Array.isArray(body?.items)) {
    console.log("extractPaged - Found body.total and body.items");
    return { total: body.total, items: body.items };
  }
  
  // Case 2: Nested format { data: { total, items } }
  if (body?.data?.total !== undefined && Array.isArray(body?.data?.items)) {
    console.log("extractPaged - Found body.data.total and body.data.items");
    return { total: body.data.total, items: body.data.items };
  }
  
  // Case 3: Direct array
  if (Array.isArray(body)) {
    console.log("extractPaged - Body is array");
    return { total: body.length, items: body };
  }
  
  // Case 4: Nested array in data
  if (Array.isArray(body?.data)) {
    console.log("extractPaged - Body.data is array");
    return { total: body.data.length, items: body.data };
  }
  
  // Case 5: Items as array but no total (calculate from length)
  if (Array.isArray(body?.items)) {
    console.log("extractPaged - Body.items is array (no total, using length)");
    return { total: body.items.length, items: body.items };
  }
  
  // Case 6: Result as array
  if (Array.isArray(body?.result)) {
    console.log("extractPaged - Body.result is array");
    return { total: body.result.length, items: body.result };
  }
  
  // Case 7: Nested data.items
  if (Array.isArray(body?.data?.items)) {
    console.log("extractPaged - Body.data.items is array");
    return { total: body.data.items.length, items: body.data.items };
  }
  
  // Case 8: Try to find any array property
  for (const key in body) {
    if (Array.isArray(body[key])) {
      console.log(`extractPaged - Found array property "${key}"`);
      return { total: body[key].length, items: body[key] };
    }
  }
  
  console.log("extractPaged - No match, returning empty");
  console.log("extractPaged - Available keys:", body ? Object.keys(body) : []);
  return { total: 0, items: [] };
};

const AdminApi = {
  // GET /api/StaffOfAdmin/users
  getUsers: (params = {}) => {
    console.log("AdminApi.getUsers - Starting request with params:", params);
    return api.get("/api/StaffOfAdmin/users", { params: clean(params) })
      .then((res) => {
        console.log("AdminApi.getUsers - Raw axios response:", res);
        console.log("AdminApi.getUsers - Response status:", res?.status);
        console.log("AdminApi.getUsers - Response data:", res?.data);
        console.log("AdminApi.getUsers - Response data type:", typeof res?.data);
        console.log("AdminApi.getUsers - Response data keys:", res?.data ? Object.keys(res?.data) : 'null');
        
        // Handle axios response structure: axios wraps the actual response in res.data
        const body = res?.data ?? res;
        console.log("AdminApi.getUsers - Body after extraction:", body);
        console.log("AdminApi.getUsers - Body type:", typeof body);
        console.log("AdminApi.getUsers - Body keys:", body ? Object.keys(body) : 'null');
        
        const extracted = extractPaged(body);
        console.log("AdminApi.getUsers - Extracted result:", extracted);
        console.log("AdminApi.getUsers - Extracted total:", extracted.total);
        console.log("AdminApi.getUsers - Extracted items length:", extracted.items?.length);
        console.log("AdminApi.getUsers - Extracted items is array:", Array.isArray(extracted.items));
        
        // Ensure we always return valid structure
        if (!Array.isArray(extracted.items)) {
          console.warn("AdminApi.getUsers - items is not an array, defaulting to empty array");
          console.warn("AdminApi.getUsers - items type:", typeof extracted.items);
          console.warn("AdminApi.getUsers - items value:", extracted.items);
          return { total: 0, items: [] };
        }
        
        const result = { total: extracted.total || 0, items: extracted.items || [] };
        console.log("AdminApi.getUsers - Final result:", result);
        return result;
      })
      .catch((error) => {
        console.error("AdminApi.getUsers - Error:", error);
        console.error("AdminApi.getUsers - Error message:", error?.message);
        console.error("AdminApi.getUsers - Error response:", error?.response);
        console.error("AdminApi.getUsers - Error response status:", error?.response?.status);
        console.error("AdminApi.getUsers - Error response data:", error?.response?.data);
        console.error("AdminApi.getUsers - Error stack:", error?.stack);
        // Return empty result instead of throwing to prevent UI crash
        return { total: 0, items: [] };
      });
  },

  // GET /api/StaffOfAdmin/users/enrollment-semesters -> [{ semesterId, name }]
  getEnrollmentSemesters: () =>
    api.get("/api/StaffOfAdmin/users/enrollment-semesters").then((res) => res?.data ?? []),

  // GET /api/StaffOfAdmin/departments -> [{ departmentId, name }]
  getDepartments: () =>
    api.get("/api/StaffOfAdmin/departments").then((res) => res?.data ?? []),

  // DETAIL / CRUD
  getUserById: (id) => api.get(`/api/StaffOfAdmin/users/${id}`).then(unwrap),
  createUser: (payload) => {
    return api.post("/api/StaffOfAdmin/users", payload)
      .then((res) => {
        // For POST requests, preserve the full response structure
        // Backend returns: { code: 201, data: {...} }
        // Axios wraps it in res.data
        return res.data; // Return { code: 201, data: {...} } directly
      })
      .catch((error) => {
        // For errors, return the error response data if available
        if (error.response?.data) {
          return Promise.reject({
            response: {
              data: error.response.data,
              status: error.response.status
            },
            message: error.message
          });
        }
        return Promise.reject(error);
      });
  },
  updateUser: (id, payload) => api.put(`/api/StaffOfAdmin/users/${id}`, payload).then(unwrap),
  deleteUser: (id) => api.delete(`/api/StaffOfAdmin/users/${id}`).then(unwrap),

  setUserStatus: (id, isActive) =>
    api.patch(`/api/StaffOfAdmin/users/${id}/status`, { isActive }).then(unwrap),

  importUsers: (file) => {
    const form = new FormData();
    form.append("file", file);
    return api.post("/api/StaffOfAdmin/users/import", form).then(unwrap);
  },
};

export default AdminApi;
