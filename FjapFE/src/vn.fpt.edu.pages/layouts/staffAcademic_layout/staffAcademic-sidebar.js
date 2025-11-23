import React from 'react';
import { Menu } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import { TeamOutlined, BookOutlined, ReadOutlined, EditOutlined, HomeOutlined, ScheduleOutlined } from '@ant-design/icons';
import { useAuth } from '../../../vn.fpt.edu.pages/login/AuthContext';

const { Item, SubMenu } = Menu;

const COLORS = {
  sider: "#e9f2ff",
  siderBorder: "#cfe3ff",
  menuText: "#0f2a5a",
};

const StaffAcademicSidebar = () => {
  const location = useLocation();
  const { user } = useAuth();
  const roleId = user ? Number(user.roleId) : null;
  const segments = location.pathname.split('/');
  const activeGroup = segments[2] || '';

  const selectedKey = location.pathname;
  const defaultOpenKeys = [];
  if (activeGroup === 'materials') defaultOpenKeys.push('materials');
  if (activeGroup === 'classes') defaultOpenKeys.push('classes');
  if (activeGroup === 'grades') defaultOpenKeys.push('grades');
  if (activeGroup === 'subject') defaultOpenKeys.push('subject');
  if (activeGroup === 'createSchedule') defaultOpenKeys.push('/staffAcademic/createSchedule');

  return (
    <div style={{
      height: '100vh',
      background: COLORS.sider,
      borderRight: `1px solid ${COLORS.siderBorder}`,
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      left: 0,
      top: 0,
      width: 260,
      overflowY: 'auto',
    }}>
      {/* Logo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px 0",
        }}
      >
        <img
          src="/FJAP.png"
          alt="FPT Japan Academy"
          style={{ height: 44 }}
        />
      </div>

      {/* Menu */}
      <Menu
        mode="inline"
        theme="light"
        selectedKeys={[selectedKey]}
        defaultOpenKeys={defaultOpenKeys}
        rootClassName="fjap-sider-menu"
        style={{
          borderRight: 0,
          background: COLORS.sider,
          color: COLORS.menuText,
          fontWeight: 600,
          paddingBottom: 10,
          flex: 1,
        }}
      >
        <Item key="/staffAcademic/dashboard" icon={<HomeOutlined />}>
          <Link to="/staffAcademic/dashboard">Dashboard</Link>
        </Item>

        <Item key="/staffAcademic/materials" icon={<BookOutlined />}>
          <Link to="/staffAcademic/materials">Materials</Link>
        </Item>

        <Item key="/staffAcademic/subject" icon={<BookOutlined />}>
          <Link to="/staffAcademic/subject">Subjects</Link>
        </Item>

        <Item key="/staffAcademic/classes" icon={<ReadOutlined />}>
          <Link to="/staffAcademic/classes">Classes</Link>
        </Item>

        <SubMenu key="grades" icon={<EditOutlined />} title="Grades">
          <Item key="/staffAcademic/grades/edit">
            <Link to="/staffAcademic/grades/edit">Edit Grades</Link>
          </Item>
        </SubMenu>
        {roleId === 5 && (
          <SubMenu key="/staffAcademic/createSchedule" icon={<ScheduleOutlined />} title="Schedule">
            <Item key="/staffAcademic/createSchedule/edit">
              <Link to="/staffAcademic/createSchedule/edit">Create Schedule</Link>
            </Item>
            <Item key="/staffAcademic/createSchedule/editSchedule">
              <Link to="/staffAcademic/createSchedule/editSchedule">Edit Schedule</Link>
            </Item>
            <Item key="/staffAcademic/createSchedule/import">
              <Link to="/staffAcademic/createSchedule/import">Import Schedule</Link>
            </Item>
          </SubMenu>
        )}
      </Menu>
    </div>
  );
};

export default StaffAcademicSidebar;

