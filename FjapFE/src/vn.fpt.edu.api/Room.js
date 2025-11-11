import { api } from "./http";

// unwrap các dạng {code:200,data:{...}} | {data:{...}} | {...}
const unwrap = (res) => res?.data?.data ?? res?.data ?? res;

// lọc param rỗng
const clean = (o = {}) =>
  Object.fromEntries(
    Object.entries(o).filter(([_, v]) => v !== undefined && v !== null && v !== "")
  );

const RoomApi = {
    // GET /api/StaffOfAdmin/rooms
    getRooms: (params = {}) =>
        api.get("/api/StaffOfAdmin/rooms", { params: clean(params) })
            .then((res) => {
                const body = res?.data ?? res;
                if (body?.total !== undefined && Array.isArray(body?.items)) {
                    return { total: body.total, items: body.items };
                }
                if (Array.isArray(body)) {
                    return { total: body.length, items: body };
                }
                if (body?.data && Array.isArray(body.data)) {
                    return { total: body.data.length, items: body.data };
                }
                return { total: 0, items: [] };
            })
            .catch((error) => {
                console.error('RoomApi.getRooms - Error:', error);
                throw error;
            }),

    // GET /api/StaffOfAdmin/rooms/{id}
    getRoomById: (id) => api.get(`/api/StaffOfAdmin/rooms/${id}`).then(unwrap),

    // POST /api/StaffOfAdmin/rooms
    createRoom: (payload) => {
        return api.post("/api/StaffOfAdmin/rooms", payload)
            .then((res) => {
                return res.data; // Return { code: 201, data: {...} }
            })
            .catch((error) => {
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

    // PUT /api/StaffOfAdmin/rooms/{id}
    updateRoom: (id, payload) => 
        api.put(`/api/StaffOfAdmin/rooms/${id}`, payload)
            .then((res) => res?.data ?? res)
            .catch((error) => {
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
            }),

    // PATCH /api/StaffOfAdmin/rooms/{id}/status
    updateRoomStatus: (id, status) => 
        api.patch(`/api/StaffOfAdmin/rooms/${id}/status`, { status })
            .then((res) => res?.data ?? res)
            .catch((error) => {
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
            }),

    // DELETE /api/StaffOfAdmin/rooms/{id}
    deleteRoom: (id) => 
        api.delete(`/api/StaffOfAdmin/rooms/${id}`)
            .then(() => ({ success: true }))
            .catch((error) => {
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
            }),
};

export default RoomApi;

