import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { api } from "./api";
import { useAuth } from "./AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;

  async function onSuccess(credentialResponse) {
    try {
      const res = await api.post("/api/auth/login", {
        credential: credentialResponse.credential, // id_token
      });
      const { token, email, name, picture } = res.data;
      login({ 
        token, 
        profile: { email, name, picture } 
      });
    } catch (e) {
      console.error(e);
      alert("Đăng nhập thất bại");
    }
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <div style={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
        <h2>Đăng nhập</h2>
        <GoogleLogin
          onSuccess={onSuccess}
          onError={() => alert("Google Login Error")}
          useOneTap // tùy chọn: bật One Tap
        />
      </div>
    </GoogleOAuthProvider>
  );
}
