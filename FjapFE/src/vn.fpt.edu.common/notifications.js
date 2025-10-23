import React, { createContext, useContext, useMemo } from "react";
import { notification } from "antd";
import { LoadingOutlined } from "@ant-design/icons";

const DEFAULT_PLACEMENT = "topRight";
const DEFAULT_DURATION = 3;

const NotificationContext = createContext(null);

const spinnerIcon = <LoadingOutlined style={{ color: "#2563eb" }} spin />;

export const NotificationProvider = ({ children }) => {
  const [api, contextHolder] = notification.useNotification();

  const helpers = useMemo(
    () => ({
      pending: (key, message, description) => {
        api.open({
          key,
          message,
          description,
          icon: spinnerIcon,
          duration: 0,
          placement: DEFAULT_PLACEMENT,
        });
      },
      success: (key, message, description) => {
        api.success({
          key,
          message,
          description,
          placement: DEFAULT_PLACEMENT,
          duration: DEFAULT_DURATION,
        });
      },
      error: (key, message, description) => {
        api.error({
          key,
          message,
          description,
          placement: DEFAULT_PLACEMENT,
          duration: DEFAULT_DURATION,
        });
      },
    }),
    [api]
  );

  return (
    <NotificationContext.Provider value={helpers}>
      {contextHolder}
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotify = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotify must be used within NotificationProvider");
  }
  return context;
};
