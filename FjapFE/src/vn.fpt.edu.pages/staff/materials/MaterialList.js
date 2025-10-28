import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Space, Modal, Tag, Input, Select, message } from 'antd';
import { EyeOutlined, EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import CreateMaterialModal from './CreateMaterialModal';
import EditMaterialModal from './EditMaterialModal';
import MaterialDetail from './MaterialDetail';
import { getMaterials, createMaterial, updateMaterial, deleteMaterial, getSubjects } from '../../../vn.fpt.edu.api/Material';
import AdminApi from '../../../vn.fpt.edu.api/Admin';

const { Option } = Select;

export default function MaterialList() {
  const formatDate = (input) => {
    if (!input) return '—';
    try {
      const d = new Date(input);
      if (isNaN(d.getTime())) return input;
      const pad = (n) => String(n).padStart(2, '0');
      const day = pad(d.getDate());
      const month = pad(d.getMonth() + 1);
      const year = d.getFullYear();
      const hours = pad(d.getHours());
      const mins = pad(d.getMinutes());
      return `${day}/${month}/${year} ${hours}:${mins}`;
    } catch (e) {
      return input;
    }
  };
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState(null);

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [deleting, setDeleting] = useState(null);
  const [deletingInProgress, setDeletingInProgress] = useState(false);

  const fetchMaterials = React.useCallback(async () => {
    setLoading(true);
    try {
      // Tìm subjectCode từ subjectId để gửi đúng parameter cho backend
      let subjectCode = null;
      if (subjectFilter) {
        const selectedSubject = subjects.find(s => (s.subjectId || s.id) === subjectFilter);
        subjectCode = selectedSubject?.subjectCode || selectedSubject?.code;
        console.log('MaterialList - Selected subject:', selectedSubject, 'subjectCode:', subjectCode);
      }
      
      const res = await getMaterials({ search, subject: subjectCode });
      const items = res.items || [];
      console.log('MaterialList - Materials loaded:', items);
      console.log('MaterialList - Current subjectFilter:', subjectFilter, 'subjectCode sent:', subjectCode);
      setData(items);
    } catch (e) {
      console.error(e);
      message.error('Failed to load materials');
    } finally {
      setLoading(false);
    }
  }, [search, subjectFilter, subjects]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  useEffect(() => {
    (async () => {
      try {
        const s = await getSubjects();
        console.log('MaterialList - Subjects loaded:', s);
        setSubjects(s || []);
      } catch (e) {
        console.error('Failed to load subjects in MaterialList:', e);
      }
    })();
  }, []);

  const handleDelete = (idOrRecord) => {
    // Accept either id or full record
    const id = idOrRecord && idOrRecord.id ? idOrRecord.id : idOrRecord;
    // if full record passed, keep it for modal display
    const record = idOrRecord && idOrRecord.id ? idOrRecord : null;
    console.debug('handleDelete invoked, id=', id, 'record=', record);
    setDeleting({ id, record });
  };

  const columns = [
    { title: 'Material ID', dataIndex: 'id', key: 'id' },
    { title: 'Material Name', dataIndex: 'title', key: 'name', render: (_, r) => r.title || r.name },
    { title: 'Subject Code', dataIndex: 'subjectCode', key: 'subject', render: (_, r) => r.subjectCode || r.subject },
    { title: 'Creator', dataIndex: 'creator', key: 'creator' },
  { title: 'Created Date', dataIndex: 'created', key: 'created', render: (_, r) => formatDate(r.createdDate || r.created) },
    { title: 'Status', key: 'status', render: (_, r) => (<Tag color={(r.status || '').toLowerCase() === 'active' ? 'blue' : 'volcano'}>{r.status || r.statusName || r.status}</Tag>) },
    { title: 'Actions', key: 'actions', render: (_, r) => (
      <Space>
        <Button icon={<EyeOutlined />} onClick={() => setDetail(r)} />
        {r.status === 'active' && (
          <Button icon={<EditOutlined />} onClick={() => setEditing(r)} />
        )}
        {r.status !== 'inActive' && (
          <Button danger icon={<DeleteOutlined />} onClick={() => handleDelete(r)} />
        )}
      </Space>
    )},
  ];

  const filtered = data.filter((d) => {
    if (search && !(`${d.title || d.name} ${d.id || d.materialId} ${d.subjectCode || d.subject}`.toLowerCase().includes(search.toLowerCase()))) return false;
    return true; // Không cần filter ở frontend nữa vì đã filter ở backend
  });

  const handleCreate = async (values) => {
    try {
      await createMaterial({ 
        title: values.name || values.materialName, 
        description: values.description, 
        fileUrl: values.link, 
        subjectId: values.subject
      });
      message.success('Tạo thành công');
      setShowCreate(false);
      fetchMaterials();
    } catch (e) {
      console.error(e);
      message.error('Tạo thất bại');
    }
  };

  const handleSave = async (values) => {
    try {
      const id = editing.id || editing.materialId;
      await updateMaterial(id, { 
        title: values.name || values.materialName, 
        description: values.description, 
        fileUrl: values.link, 
        subjectId: values.subject
      });
      message.success('Cập nhật thành công');
      setEditing(null);
      fetchMaterials();
    } catch (e) {
      console.error(e);
      message.error('Cập nhật thất bại');
    }
  };

  return (
    <div>
      <Card style={{ borderRadius: 12 }}>
        <Space style={{ width: '100%', marginBottom: 12, justifyContent: 'space-between' }}>
          <Space>
            <Input.Search placeholder="Search materials..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 240 }} />
            <Select 
              placeholder="All Subjects" 
              allowClear 
              showSearch
              filterOption={(input, option) =>
                (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
              }
              style={{ width: 160 }} 
              value={subjectFilter} 
              onChange={setSubjectFilter}
            >
              {subjects.map((s) => (
                <Option key={s.subjectId || s.id} value={s.subjectId || s.id}>
                  {s.subjectCode || s.code}
                </Option>
              ))}
            </Select>
          </Space>

          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCreate(true)}>Add Material</Button>
        </Space>

        <Table columns={columns} dataSource={filtered} rowKey={(r) => r.id || r.materialId} loading={loading} pagination={{ pageSize: 6 }} />
      </Card>

        {/* Confirmation modal for delete (soft-delete) */}
        {deleting && (
          <Modal
            title="Deactivate Material"
            open={!!deleting}
            visible={!!deleting}
            onCancel={() => { if (!deletingInProgress) setDeleting(null); }}
            onOk={async () => {
              console.debug('Delete modal OK clicked, deleting=', deleting);
              if (!deleting || deletingInProgress) return;
              setDeletingInProgress(true);
              try {
                await deleteMaterial(deleting.id);
                message.success('Deleted');
                setDeleting(null);
                await fetchMaterials();
              } catch (e) {
                console.error('deleteMaterial failed', e);
                message.error('Delete failed');
              } finally {
                setDeletingInProgress(false);
              }
            }}
            centered
            maskClosable={false}
            cancelText="Cancel"
            okText="Delete"
            okButtonProps={{ danger: true, loading: deletingInProgress, disabled: deletingInProgress }}
            cancelButtonProps={{ disabled: deletingInProgress }}
          >
            <p>Are you sure you want to deactivate this material? This will set the material status to Inactive.</p>
            {deleting.record && (
              <p style={{ marginTop: 8 }}><strong>{deleting.record.title || deleting.record.name}</strong></p>
            )}
          </Modal>
        )}

        <CreateMaterialModal visible={showCreate} onCancel={() => setShowCreate(false)} onCreate={handleCreate} />

      {editing && <EditMaterialModal visible={!!editing} record={editing} onCancel={() => setEditing(null)} onSave={handleSave} />}

      {detail && <MaterialDetail visible={!!detail} record={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
