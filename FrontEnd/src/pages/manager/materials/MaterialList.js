import React, { useEffect, useMemo, useState } from "react";
import "./material.css";
import { getMaterials, getSubjects } from "../../../api/Material";
import FilterBar from "./components/FilterBar";
import MaterialTable from "./components/MaterialTable";
import Pagination from "./components/Pagination";
import CreateMaterialModal from "./popups/CreateMaterialModal";
import EditMaterialModal from "./popups/EditMaterialModal";
import DeleteMaterialModal from "./popups/DeleteMaterialModal";
import DetailMaterialModal from "./popups/DetailMaterialModal";

const PAGE_SIZE = 10;

export default function MaterialList() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("");
  const [status, setStatus] = useState("");
  const [subjects, setSubjects] = useState([]);

  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const [openCreate, setOpenCreate] = useState(false);
  const [editId, setEditId] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);

  const [searchDebounced, setSearchDebounced] = useState("");
  useEffect(() => { const t = setTimeout(()=>setSearchDebounced(search), 400); return ()=>clearTimeout(t); }, [search]);

  useEffect(() => { (async()=>setSubjects(await getSubjects()))(); }, []);

  const params = useMemo(() => ({ page, pageSize: PAGE_SIZE, search: searchDebounced, subject, status }), [page, searchDebounced, subject, status]);

  async function load() {
    setLoading(true);
    try {
      const data = await getMaterials(params);
      setRows(data.items);
      setTotal(data.total);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [params]);

  return (
    <div className="mtl-page">
      <FilterBar
        search={search} onSearch={(v)=>{ setPage(1); setSearch(v); }}
        subject={subject} onSubject={(v)=>{ setPage(1); setSubject(v); }}
        status={status} onStatus={(v)=>{ setPage(1); setStatus(v); }}
        subjects={subjects}
        onAdd={()=> setOpenCreate(true)}
      />

      <MaterialTable
        rows={rows}
        loading={loading}
        onView={(r)=> setDetailId(r.id || r.materialId)}
        onEdit={(r)=> setEditId(r.id || r.materialId)}
        onDelete={(r)=> setDeleteRow({ id: r.id || r.materialId, name: r.materialName })}
      />

      <Pagination
        page={page}
        pages={pages}
        onPrev={()=> setPage(p=>Math.max(1, p-1))}
        onNext={()=> setPage(p=>Math.min(pages, p+1))}
      />

      {/* 4 popups */}
      <CreateMaterialModal open={openCreate} onClose={()=>setOpenCreate(false)} onCreated={load} />
      <EditMaterialModal open={!!editId} id={editId} onClose={()=>setEditId(null)} onUpdated={load} />
      <DetailMaterialModal open={!!detailId} id={detailId} onClose={()=>setDetailId(null)} />
      <DeleteMaterialModal open={!!deleteRow} id={deleteRow?.id} name={deleteRow?.name} onClose={()=>setDeleteRow(null)} onDeleted={load} />
    </div>
  );
}
