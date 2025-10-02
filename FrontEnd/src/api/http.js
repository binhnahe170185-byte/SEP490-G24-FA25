
import axios from "axios";
//const API_BASE = process.env.REACT_APP_API_BASE;
const http = axios.create({ baseURL: "http://localhost:5000" });

export default http;
