import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Space, Modal, Tag, Input, Select, message, notification } from 'antd';
import { EyeOutlined, EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import CreateMaterialModal from './CreateMaterialModal';
import EditMaterialModal from './EditMaterialModal';
import MaterialDetail from './MaterialDetail';
import { getMaterials, createMaterial, updateMaterial, deleteMaterial, getSubjects } from '../../../vn.fpt.edu.api/Material';

const { Option } = Select;

export default function MaterialList() {
  const [api, contextHolder] = notification.useNotification();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sorterState, setSorterState] = useState({ columnKey: null, order: null }); // {columnKey:'status', order:'ascend'|'descend'|null}

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      const pad = (n) => String(n).padStart(2, '0');
      const day = pad(date.getDate());
      const month = pad(date.getMonth() + 1);
      const year = date.getFullYear();
      const hour = pad(date.getHours());
      const minute = pad(date.getMinutes());
      return `${day}/${month}/${year} ${hour}:${minute}`;
    } catch (e) {
      console.error("Error formatting date:", e);
      return dateString;
    }
  };

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
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: 'Material Name', dataIndex: 'title', key: 'name', render: (_, r) => r.title || r.name },
    { title: 'Subject Code', dataIndex: 'subjectCode', key: 'subject', render: (_, r) => r.subjectCode || r.subject },
    { title: 'Creator', dataIndex: 'creator', key: 'creator' },
  { title: 'Created Date', dataIndex: 'created', key: 'created', render: (_, r) => formatDate(r.createdDate || r.created || r.createdAt) },
    { 
      title: 'Status', 
      dataIndex: 'status',
      key: 'status',
      sorter: (a, b) => {
        const av = (a.status || '').toString().toLowerCase();
        const bv = (b.status || '').toString().toLowerCase();
        // active < inactive
        const toNum = (v) => (v === 'active' ? 0 : v === 'inactive' ? 1 : 2);
        return toNum(av) - toNum(bv);
      },
      sortDirections: ['ascend','descend'],
      sortOrder: sorterState.columnKey === 'status' ? sorterState.order : null,
      render: (_, r) => (
        <Tag color={(r.status || '').toLowerCase() === 'active' ? 'blue' : 'volcano'} style={{ textTransform: 'capitalize' }}>
          {(r.status || r.statusName || r.status || '').toString().toLowerCase() || '—'}
        </Tag>
      )
    },
    { title: 'Actions', key: 'actions', render: (_, r) => (
      <Space>
        <Button icon={<EyeOutlined />} onClick={() => setDetail(r)} />
        {(String(r.status || '').toLowerCase() === 'active') && (
          <Button icon={<EditOutlined />} onClick={() => setEditing(r)} />
        )}
        {(String(r.status || '').toLowerCase() !== 'inactive') && (
          <Button danger icon={<DeleteOutlined />} onClick={() => handleDelete(r)} />
        )}
      </Space>
    )},
  ];

  const filtered = data.filter((d) => {
    if (search && !(`${d.title || d.name} ${d.id || d.materialId} ${d.subjectCode || d.subject}`.toLowerCase().includes(search.toLowerCase()))) return false;
    return true; // Không cần filter ở frontend nữa vì đã filter ở backend
  });

  // Client-side sort when user clicks the Status header
  const sorted = React.useMemo(() => {
    if (sorterState.columnKey !== 'status' || !sorterState.order) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = (a.status || '').toString().toLowerCase();
      const bv = (b.status || '').toString().toLowerCase();
      const toNum = (v) => (v === 'active' ? 0 : v === 'inactive' ? 1 : 2);
      const cmp = toNum(av) - toNum(bv);
      return sorterState.order === 'ascend' ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sorterState]);

  const handleCreate = async (values) => {
    try {
      await createMaterial({ 
        title: values.name || values.materialName, 
        description: values.description, 
        fileUrl: values.link, 
        subjectId: values.subject
      });
      api.success({
        message: 'Success',
        description: 'Material created successfully',
        placement: 'topRight',
        duration: 3,
      });
      setShowCreate(false);
      fetchMaterials();
    } catch (e) {
      console.error(e);
      api.error({
        message: 'Error',
        description: `Failed to create material: ${e?.response?.data?.message ?? e.message}`,
        placement: 'topRight',
        duration: 3,
      });
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
      api.success({
        message: 'Success',
        description: 'Material updated successfully',
        placement: 'topRight',
        duration: 3,
      });
      setEditing(null);
      fetchMaterials();
    } catch (e) {
      console.error(e);
      api.error({
        message: 'Error',
        description: `Failed to update material: ${e?.response?.data?.message ?? e.message}`,
        placement: 'topRight',
        duration: 3,
      });
    }
  };

  return (
    <div>
      {contextHolder}
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

        <Table 
          columns={columns} 
          dataSource={sorted} 
          rowKey={(r) => r.id || r.materialId} 
          loading={loading}
          
          onChange={(_, __, sorter) => {
            // Only track status column sorter
            if (sorter && sorter.columnKey === 'status') {
              setSorterState({ columnKey: 'status', order: sorter.order || null });
            } else {
              setSorterState({ columnKey: null, order: null });
            }
          }}
          pagination={{
            current: page,
            pageSize,
            total: sorted.length,
            showSizeChanger: true,
            showTotal: (total, range) => (
              <span style={{ color: '#595959' }}>
                Showing <strong>{range[0]}-{range[1]}</strong> of <strong>{total}</strong> items
              </span>
            ),
            onChange: (p, ps) => { setPage(p); setPageSize(ps); },
            style: { marginTop: 16 }
          }}
          
        />
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
                api.success({
                  message: 'Success',
                  description: 'Material deleted (deactivated) successfully',
                  placement: 'topRight',
                  duration: 3,
                });
                setDeleting(null);
                await fetchMaterials();
              } catch (e) {
                console.error('deleteMaterial failed', e);
                api.error({
                  message: 'Error',
                  description: `Failed to delete material: ${e?.response?.data?.message ?? e.message}`,
                  placement: 'topRight',
                  duration: 3,
                });
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
