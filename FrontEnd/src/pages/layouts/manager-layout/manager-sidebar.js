import React from 'react';
import { Menu } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  BookOutlined,
  ReadOutlined,
} from '@ant-design/icons';

const ManagerSidebar = () => {
  const location = useLocation();

  const items = [
    {
      key: '/manager/dashboard',
      icon: <DashboardOutlined />,
      label: <Link to="/manager/dashboard">Dashboard</Link>,
    },
    {
      key: '/manager/class',
      icon: <BookOutlined />,
      label: <Link to="/manager/class">List Class</Link>,
    },
    {
      key: "/manager/subject",
      icon: <ReadOutlined />,
      label: <Link to="/manager/subject">List Subject</Link>,
    },
    {
      key: "/manager/subject/create",
      icon: <ReadOutlined />,
      label: <Link to="/manager/subject/create">Create Subject</Link>,
    },
  ];

  return (
    <Menu
      mode="inline"
      items={items}
      selectedKeys={[location.pathname]}
      style={{ width: "100%", height: "100%" }}
    />
  );
};

export default ManagerSidebar;
