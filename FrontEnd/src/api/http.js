
import axios from "axios";
const API_BASE = process.env.REACT_APP_API_BASE;
const http = axios.create({ baseURL: API_BASE });

export default http;
