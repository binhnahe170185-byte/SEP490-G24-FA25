import React from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/http";
import { useAuth } from "./AuthContext";
import "./login.css";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  async function onSuccess(credentialResponse) {
    try {
      const { data } = await api.post("/api/auth/login", {
        credential: credentialResponse.credential,
      });

      const token = data?.token;
      if (!token) throw new Error("Missing token");

      const profile = {
        email: data.email ?? "",
        name: data.name ?? "",
        picture: data.picture ?? null,
        roleId: data.roleId ?? data.role_id ?? 1,
      };

      login({ token, profile });
      // Điều hướng sau khi đăng nhập
      // Number(profile.roleId) === 2 ? navigate("/manager", { replace: true }) :
      navigate("/", { replace: true });
    } catch (e) {
      console.error(e);
      alert("Đăng nhập thất bại");
    }
  }

  return (
    <div className="lp">
      {/* LEFT: login card */}
      <div className="lp-left">
        <div className="lp-card">
          <div className="lp-logo"> </div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <img
              src="/FJAP.png"
              alt="FJAP Logo"
              style={{
                width: 64,
                height: 64,
                objectFit: "contain",
                marginRight: 16,
              }}
            />
            <h2 className="lp-title">Login</h2>
          </div>

          <p className="lp-subtitle">
            Students, Lecturers, Managers of FPT Japan Academy
          </p>

          <div className="lp-actions">
            <GoogleLogin
              onSuccess={onSuccess}
              onError={() => alert("Google Login Error")}
              useOneTap
              size="large"
              shape="pill"
              theme="outline"
              text="signin_with"
            />
          </div>
        </div>
      </div>
      <div
        className="lp-right"
        style={{
          backgroundImage: `url('loginImage.jpg')`,
        }}
        aria-label="Campus"
      />
    </div>
  );
}
