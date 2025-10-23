import React from 'react';
import { Menu } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import { TeamOutlined, BookOutlined, ReadOutlined, EditOutlined } from '@ant-design/icons';

const { Item, SubMenu } = Menu;

const StaffAcademicSidebar = () => {
  const location = useLocation();
  const segments = location.pathname.split('/');
  const activeGroup = segments[2] || '';

  const selectedKey = location.pathname;
  const defaultOpenKeys = [];
  if (activeGroup === 'materials') defaultOpenKeys.push('materials');
  if (activeGroup === 'classes') defaultOpenKeys.push('classes');
  if (activeGroup === 'grades') defaultOpenKeys.push('grades');

  return (
    <Menu
      mode="inline"
      theme="light"
      selectedKeys={[selectedKey]}
      defaultOpenKeys={defaultOpenKeys}
      style={{ height: '100%', borderRight: 0, padding: 8, background: '#e9f6ff' }}
      rootClassName="fjap-sider-menu"
    >
      <Item key="/staffAcademic/dashboard" icon={<TeamOutlined />}>
        <Link to="/staffAcademic/dashboard">Dashboard</Link>
      </Item>

      <Item key="/staffAcademic/materials" icon={<BookOutlined />}>
        <Link to="/staffAcademic/materials">Materials</Link>
      </Item>


  

      <SubMenu key="classes" icon={<ReadOutlined />} title="Classes">
        <Item key="/staffAcademic/classes/list">
          <Link to="/staffAcademic/classes/list">View List Class</Link>
        </Item>
        <Item key="/staffAcademic/classes/add">
          <Link to="/staffAcademic/classes/add">Add Class</Link>
        </Item>
        <Item key="/staffAcademic/classes/edit">
          <Link to="/staffAcademic/classes/edit">Edit Class</Link>
        </Item>
        <Item key="/staffAcademic/classes/detail">
          <Link to="/staffAcademic/classes/detail">View class detail</Link>
        </Item>
        <Item key="/staffAcademic/classes/students">
          <Link to="/staffAcademic/classes/students">View class students</Link>
        </Item>
        <Item key="/staffAcademic/classes/import">
          <Link to="/staffAcademic/classes/import">Import students</Link>
        </Item>
      </SubMenu>

      <SubMenu key="grades" icon={<EditOutlined />} title="Grades">
        <Item key="/staffAcademic/grades/edit">
          <Link to="/staffAcademic/grades/edit">Edit Grades</Link>
        </Item>
      </SubMenu>
    </Menu>
  );
};

export default StaffAcademicSidebar;

