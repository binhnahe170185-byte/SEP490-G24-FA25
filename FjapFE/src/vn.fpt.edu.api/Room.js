import { api } from "./http";

// unwrap các dạng {code:200,data:{...}} | {data:{...}} | {...}
const unwrap = (res) => res?.data?.data ?? res?.data ?? res;

const RoomApi = {
    // GET /api/Room
    getRooms: (params = {}) =>
        api.get("/api/Room", { params })
            .then((res) => {
                console.log('RoomApi.getRooms - Raw response:', res);
                console.log('RoomApi.getRooms - Response data:', res?.data);
                const body = res?.data ?? res;
                console.log('RoomApi.getRooms - Body:', body);

                if (body?.total !== undefined && Array.isArray(body?.items)) {
                    console.log('RoomApi.getRooms - Returning paginated format:', { total: body.total, items: body.items });
                    return { total: body.total, items: body.items };
                }
                if (Array.isArray(body)) {
                    console.log('RoomApi.getRooms - Returning array format:', { total: body.length, items: body });
                    return { total: body.length, items: body };
                }
                if (body?.data && Array.isArray(body.data)) {
                    console.log('RoomApi.getRooms - Returning nested data format:', { total: body.data.length, items: body.data });
                    return { total: body.data.length, items: body.data };
                }
                console.warn('RoomApi.getRooms - Unexpected format, returning empty:', body);
                return { total: 0, items: [] };
            })
            .catch((error) => {
                console.error('RoomApi.getRooms - Error:', error);
                console.error('RoomApi.getRooms - Error response:', error?.response);
                console.error('RoomApi.getRooms - Error message:', error?.message);
                throw error;
            }),

    // GET /api/Room/{id}
    getRoomById: (id) => api.get(`/api/Room/${id}`).then(unwrap),
};

export default RoomApi;

