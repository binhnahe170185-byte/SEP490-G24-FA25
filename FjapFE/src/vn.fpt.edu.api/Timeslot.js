import { api } from "./http";

// unwrap các dạng {code:200,data:{...}} | {data:{...}} | {...}
const unwrap = (res) => res?.data?.data ?? res?.data ?? res;

const TimeslotApi = {
  // GET /api/Timeslot
  getTimeslots: () =>
    api.get("/api/Timeslot").then((res) => {
      const body = res?.data ?? res;
      if (body?.data && Array.isArray(body.data)) {
        return body.data;
      }
      if (Array.isArray(body)) {
        return body;
      }
      return [];
    }),

  // GET /api/Timeslot/{id}
  getTimeslotById: (id) => api.get(`/api/Timeslot/${id}`).then(unwrap),
};

export default TimeslotApi;

