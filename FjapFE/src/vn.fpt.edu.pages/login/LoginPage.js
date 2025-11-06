import React from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import { api } from "../../vn.fpt.edu.api/http";
import { useAuth } from "./AuthContext";
import "./login.css";
import { notification } from "antd";
import "antd/dist/reset.css";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [notiApi, contextHolder] = notification.useNotification();

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
        accountId:
          data.accountId ?? data.account_id ?? data.userId ?? data.user_id ?? null,
        studentId: data.studentId ?? data.student_id ?? null,
        lecturerId: data.lecturerId ?? data.lecturer_id ?? null,
      };

      login({ token, profile });
      
      // Redirect based on role
      const roleId = Number(profile.roleId);
      if (roleId === 7) {
        // Academic_Staff (staffAcademic)
        navigate("/staffAcademic/dashboard", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } catch (e) {
      console.error(e);
      notiApi.error({
        message: "Access Restricted",
        description:
          "You are not authorized to access this system. Only members of FPT Japan Academy are permitted.",
        placement: "bottomRight",
        duration: 4,
      });
    }
  }

  return (
    <div className="lp" aria-label="FPT Japan Academy Login Page">
      {contextHolder}

      <section className="lp-left" aria-label="Login area">
        <div className="lp-card" role="group" aria-labelledby="lp-title">
          <img 
            id="lp-title" 
            className="lp-hero-title" 
            src="/FJAP.png" 
            alt="FPT Japan Academy"
          />

          <p className="lp-subtitle">
            Students, Lecturers, Staffs of FPT Japan Academy
          </p>

          <div className="lp-actions">
            <GoogleLogin
              onSuccess={onSuccess}
              onError={() =>
                notiApi.error({
                  message: "Google Login Error",
                  description: "Failed to authenticate with Google.",
                  placement: "bottomRight",
                })
              }
              useOneTap
              size="large"
              shape="pill"
              theme="outline"
              text="signin_with"
            />
          </div>
        </div>
      </section>

      <section
        className="lp-right"
        style={{ backgroundImage: `url('/loginImage.jpg')` }}
        aria-hidden="true"
      >
        <div className="lp-right-overlay" />
      </section>
    </div>
  );
}
