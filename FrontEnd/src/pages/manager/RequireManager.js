import { useAuth } from "../pages/login/AuthContext";
import { Navigate } from "react-router-dom";

export default function RequireManager({ children }) {
  const { user } = useAuth();
  if (!user || user.roleId !== 2) {
    return <Navigate to="/" />;
  }
  return children;
}