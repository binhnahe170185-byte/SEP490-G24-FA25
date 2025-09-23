import axios from "axios";
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000/api";
console.log("[API_BASE]", API_BASE); // <--- in ra để chắc
const http = axios.create({ baseURL: API_BASE });

export async function getStudents() {
  const res = await http.get("/api/students");
  return res.data;
}
