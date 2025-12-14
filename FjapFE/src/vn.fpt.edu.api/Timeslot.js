import { api } from "./http";

// unwrap các dạng {code:200,data:{...}} | {data:{...}} | {...}
const unwrap = (res) => res?.data?.data ?? res?.data ?? res;

const TimeslotApi = {
  // GET /api/Timeslot
  getTimeslots: () =>
    api.get("/api/Timeslot").then((res) => {
      console.log('TimeslotApi.getTimeslots - raw response:', res);
      console.log('TimeslotApi.getTimeslots - res.data:', res.data);

      // API returns: { code: 200, data: [...] }
      const body = res?.data ?? res;
      console.log('TimeslotApi.getTimeslots - body:', body);

      // Check if body has data property with array
      if (body && body.data && Array.isArray(body.data)) {
        console.log('TimeslotApi.getTimeslots - returning body.data:', body.data);
        return body.data;
      }
      // Check if body itself is an array
      if (Array.isArray(body)) {
        console.log('TimeslotApi.getTimeslots - returning body (array):', body);
        return body;
      }
      // Check if body.code exists and body.data exists
      if (body && typeof body === 'object' && body.code && body.data && Array.isArray(body.data)) {
        console.log('TimeslotApi.getTimeslots - returning body.data (with code):', body.data);
        return body.data;
      }
      console.warn('TimeslotApi.getTimeslots - no valid data found, returning empty array');
      return [];
    }),

  // GET /api/Timeslot/{id}
  getTimeslotById: (id) => api.get(`/api/Timeslot/${id}`).then(unwrap),
};

export default TimeslotApi;

