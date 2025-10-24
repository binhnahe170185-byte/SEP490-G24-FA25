import React, { useState } from 'react';
import { Card, Table, Button, Space, Modal, Tag, Input, Select } from 'antd';
import { EyeOutlined, EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import CreateMaterialModal from './CreateMaterialModal';
import EditMaterialModal from './EditMaterialModal';
import MaterialDetail from './MaterialDetail';

const { Option } = Select;

const initialData = [
  { id: 'MAT1000', name: 'Dekiru Nihongo Beginner', subject: 'JPD101', creator: 'Ikeda', created: '2024-01-15', updated: '2024-01-20', status: 'Active' },
  { id: 'MAT1001', name: 'Dekiru Nihongo Intermediate', subject: 'JPD201', creator: 'Takashi', created: '2024-01-18', updated: '2024-01-25', status: 'Active' },
  { id: 'MAT1002', name: 'Dekiru Nihongo Advanced', subject: 'JPD301', creator: 'Yamada', created: '2023-10-01', updated: '2023-11-10', status: 'Inactive', link: '' },
  { id: 'MAT1003', name: 'Nihongo TamaGo', subject: 'JPD113', creator: 'Usagi', created: '2024-02-10', updated: '2024-02-15', status: 'Active', link: '' },
];

export default function MaterialList() {
  const [data, setData] = useState(initialData);
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState(null);

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);

  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Delete Material',
      content: 'Are you sure you want to delete this material? This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      onOk() {
        setData((d) => d.filter((r) => r.id !== id));
      },
    });
  };

  const columns = [
    { title: 'Material ID', dataIndex: 'id', key: 'id' },
    { title: 'Material Name', dataIndex: 'name', key: 'name' },
    { title: 'Subject Code', dataIndex: 'subject', key: 'subject' },
    { title: 'Creator', dataIndex: 'creator', key: 'creator' },
    { title: 'Created Date', dataIndex: 'created', key: 'created' },
    { title: 'Updated Date', dataIndex: 'updated', key: 'updated' },
    { title: 'Status', key: 'status', render: (_, r) => (<Tag color={r.status === 'Active' ? 'blue' : 'volcano'}>{r.status}</Tag>) },
    { title: 'Actions', key: 'actions', render: (_, r) => (
      <Space>
        <Button icon={<EyeOutlined />} onClick={() => setDetail(r)} />
        <Button icon={<EditOutlined />} onClick={() => setEditing(r)} />
        <Button danger icon={<DeleteOutlined />} onClick={() => handleDelete(r.id)} />
      </Space>
    )},
  ];

  const filtered = data.filter((d) => {
    if (search && !(`${d.name} ${d.id} ${d.subject}`.toLowerCase().includes(search.toLowerCase()))) return false;
    if (subjectFilter && d.subject !== subjectFilter) return false;
    return true;
  });

  return (
    <div>
      <Card style={{ borderRadius: 12 }}>
        <Space style={{ width: '100%', marginBottom: 12, justifyContent: 'space-between' }}>
          <Space>
            <Input.Search placeholder="Search materials..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 240 }} />
            <Select placeholder="All Subjects" allowClear style={{ width: 160 }} value={subjectFilter} onChange={setSubjectFilter}>
              <Option value="JPD101">JPD101</Option>
              <Option value="JPD201">JPD201</Option>
              <Option value="JPD301">JPD301</Option>
            </Select>
          </Space>

          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCreate(true)}>Add Material</Button>
        </Space>

        <Table columns={columns} dataSource={filtered} rowKey="id" pagination={{ pageSize: 6 }} />
      </Card>

      <CreateMaterialModal visible={showCreate} onCancel={() => setShowCreate(false)} onCreate={(m) => { setData((d) => [m, ...d]); setShowCreate(false); }} />

      {editing && <EditMaterialModal visible={!!editing} record={editing} onCancel={() => setEditing(null)} onSave={(upd) => { setData((d) => d.map((r) => (r.id === upd.id ? upd : r))); setEditing(null); }} />}

      {detail && <MaterialDetail visible={!!detail} record={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
