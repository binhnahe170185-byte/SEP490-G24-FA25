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
  console.log("extractPaged (Semester) - Input body:", body, "Type:", typeof body);
  console.log("extractPaged (Semester) - Body JSON:", JSON.stringify(body, null, 2));
  
  // Handle empty/null/undefined
  if (!body || body === "" || body === null || body === undefined) {
    console.log("extractPaged (Semester) - Body is empty/null/undefined");
    return { total: 0, items: [] };
  }
  
  // Handle string (shouldn't happen but just in case)
  if (typeof body === "string") {
    console.log("extractPaged (Semester) - Body is string, trying to parse");
    try {
      const parsed = JSON.parse(body);
      return extractPaged(parsed);
    } catch {
      return { total: 0, items: [] };
    }
  }
  
  // Case 1: Direct format { total, items }
  if (body?.total !== undefined && Array.isArray(body?.items)) {
    console.log("extractPaged (Semester) - Found body.total and body.items");
    return { total: body.total, items: body.items };
  }
  
  // Case 2: Nested format { data: { total, items } }
  if (body?.data?.total !== undefined && Array.isArray(body?.data?.items)) {
    console.log("extractPaged (Semester) - Found body.data.total and body.data.items");
    return { total: body.data.total, items: body.data.items };
  }
  
  // Case 3: Direct array
  if (Array.isArray(body)) {
    console.log("extractPaged (Semester) - Body is array");
    return { total: body.length, items: body };
  }
  
  // Case 4: Nested array in data
  if (Array.isArray(body?.data)) {
    console.log("extractPaged (Semester) - Body.data is array");
    return { total: body.data.length, items: body.data };
  }
  
  // Case 5: Items as array but no total (calculate from length)
  if (Array.isArray(body?.items)) {
    console.log("extractPaged (Semester) - Body.items is array (no total, using length)");
    return { total: body.items.length, items: body.items };
  }
  
  // Case 6: Result as array
  if (Array.isArray(body?.result)) {
    console.log("extractPaged (Semester) - Body.result is array");
    return { total: body.result.length, items: body.result };
  }
  
  // Case 7: Nested data.items
  if (Array.isArray(body?.data?.items)) {
    console.log("extractPaged (Semester) - Body.data.items is array");
    return { total: body.data.items.length, items: body.data.items };
  }
  
  // Case 8: Try to find any array property
  for (const key in body) {
    if (Array.isArray(body[key])) {
      console.log(`extractPaged (Semester) - Found array property "${key}"`);
      return { total: body[key].length, items: body[key] };
    }
  }
  
  console.log("extractPaged (Semester) - No match, returning empty");
  console.log("extractPaged (Semester) - Available keys:", body ? Object.keys(body) : []);
  return { total: 0, items: [] };
};

const SemesterApi = {
  // GET /api/Semester
  getSemesters: (params = {}) => {
    console.log("SemesterApi.getSemesters - Starting request with params:", params);
    return api.get("/api/Semester", { params: clean(params) })
      .then((res) => {
        console.log("SemesterApi.getSemesters - Raw axios response:", res);
        console.log("SemesterApi.getSemesters - Response status:", res?.status);
        console.log("SemesterApi.getSemesters - Response data:", res?.data);
        console.log("SemesterApi.getSemesters - Response data type:", typeof res?.data);
        console.log("SemesterApi.getSemesters - Response data keys:", res?.data ? Object.keys(res?.data) : 'null');
        
        // Handle axios response structure: axios wraps the actual response in res.data
        const body = res?.data ?? res;
        console.log("SemesterApi.getSemesters - Body after extraction:", body);
        console.log("SemesterApi.getSemesters - Body type:", typeof body);
        console.log("SemesterApi.getSemesters - Body keys:", body ? Object.keys(body) : 'null');
        
        const extracted = extractPaged(body);
        console.log("SemesterApi.getSemesters - Extracted result:", extracted);
        console.log("SemesterApi.getSemesters - Extracted total:", extracted.total);
        console.log("SemesterApi.getSemesters - Extracted items length:", extracted.items?.length);
        console.log("SemesterApi.getSemesters - Extracted items is array:", Array.isArray(extracted.items));
        
        // Ensure we always return valid structure
        if (!Array.isArray(extracted.items)) {
          console.warn("SemesterApi.getSemesters - items is not an array, defaulting to empty array");
          console.warn("SemesterApi.getSemesters - items type:", typeof extracted.items);
          console.warn("SemesterApi.getSemesters - items value:", extracted.items);
          return { total: 0, items: [] };
        }
        
        const result = { total: extracted.total || 0, items: extracted.items || [] };
        console.log("SemesterApi.getSemesters - Final result:", result);
        return result;
      })
      .catch((error) => {
        console.error("SemesterApi.getSemesters - Error:", error);
        console.error("SemesterApi.getSemesters - Error message:", error?.message);
        console.error("SemesterApi.getSemesters - Error response:", error?.response);
        console.error("SemesterApi.getSemesters - Error response status:", error?.response?.status);
        console.error("SemesterApi.getSemesters - Error response data:", error?.response?.data);
        console.error("SemesterApi.getSemesters - Error stack:", error?.stack);
        // Return empty result instead of throwing to prevent UI crash
        return { total: 0, items: [] };
      });
  },

  // GET /api/Semester/{id}
  getSemesterById: (id) => api.get(`/api/Semester/${id}`).then(unwrap),

  // POST /api/Semester
  createSemester: (payload) => api.post("/api/Semester", payload).then(unwrap),

  // PUT /api/Semester/{id}
  updateSemester: (id, payload) => api.put(`/api/Semester/${id}`, payload).then(unwrap),

  // DELETE /api/Semester/{id}
  deleteSemester: (id) => api.delete(`/api/Semester/${id}`).then(unwrap),

  // GET /api/Semester/active
  getActiveSemesters: () =>
    api.get("/api/Semester/active").then((res) => res?.data ?? []),

  // GET /api/Semester/upcoming
  getUpcomingSemesters: () =>
    api.get("/api/Semester/upcoming").then((res) => res?.data ?? []),
};

export default SemesterApi;
