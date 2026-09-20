'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/client';

export default function DeficiencyTypesPage() {
  const [types, setTypes] = useState([]);
  const [edit, setEdit] = useState(null);
  const [flash, setFlash] = useState('');

  async function load() {
    setTypes((await api('/api/admin/deficiency-types')).types);
  }
  useEffect(() => { load().catch((err) => setFlash(err.message)); }, []);

  async function create(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await api('/api/admin/deficiency-types', {
      method: 'POST',
      body: JSON.stringify({ action: 'create', ...Object.fromEntries(form.entries()) }),
    });
    event.currentTarget.reset();
    setFlash('Deficiency type added.');
    await load();
  }

  async function update(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await api('/api/admin/deficiency-types', {
      method: 'POST',
      body: JSON.stringify({ action: 'update', ...Object.fromEntries(form.entries()) }),
    });
    setEdit(null);
    setFlash('Deficiency type updated.');
    await load();
  }

  async function remove(id) {
    if (!confirm('Delete this deficiency type?')) return;
    try {
      await api('/api/admin/deficiency-types', { method: 'POST', body: JSON.stringify({ action: 'delete', deficiency_id: id }) });
      setFlash('Deficiency type deleted.');
      await load();
    } catch (err) {
      setFlash(err.message);
    }
  }

  return (
    <>
      {flash ? <div className="alert alert-info">{flash}</div> : null}
      <div className="row g-3">
        <div className="col-lg-4">
          <div className="panel">
            <div className="panel-title">Add type</div>
            <form onSubmit={create}>
              <div className="mb-3"><label className="form-label">Name</label><input name="deficiency_name" className="form-control" required /></div>
              <div className="mb-3"><label className="form-label">Required document</label><input name="required_document" className="form-control" required /></div>
              <div className="mb-3"><label className="form-label">Description</label><textarea name="description" className="form-control" rows={3} /></div>
              <button className="btn btn-primary w-100">Save</button>
            </form>
          </div>
        </div>
        <div className="col-lg-8">
          <div className="panel">
            <div className="panel-title">Catalog</div>
            <div className="table-responsive">
              <table className="table">
                <thead><tr><th>Name</th><th>Required document</th><th>Description</th><th /></tr></thead>
                <tbody>
                  {types.map((t) => (
                    <tr key={t.deficiency_id}>
                      <td>{t.deficiency_name}</td>
                      <td>{t.required_document}</td>
                      <td className="small text-muted">{t.description}</td>
                      <td className="text-nowrap text-end">
                        <button className="btn btn-sm btn-outline-secondary me-1" data-bs-toggle="modal" data-bs-target="#editType" onClick={() => setEdit(t)}>Edit</button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => remove(t.deficiency_id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <div className="modal fade" id="editType" tabIndex={-1}>
        <div className="modal-dialog modal-dialog-centered modal-fullscreen-sm-down">
          <form className="modal-content" onSubmit={update}>
            <input type="hidden" name="deficiency_id" value={edit?.deficiency_id || ''} />
            <div className="modal-header"><h5 className="modal-title">Edit deficiency type</h5><button type="button" className="btn-close" data-bs-dismiss="modal" /></div>
            <div className="modal-body">
              <div className="mb-3"><label className="form-label">Name</label><input name="deficiency_name" className="form-control" defaultValue={edit?.deficiency_name || ''} required /></div>
              <div className="mb-3"><label className="form-label">Required document</label><input name="required_document" className="form-control" defaultValue={edit?.required_document || ''} required /></div>
              <div className="mb-3"><label className="form-label">Description</label><textarea name="description" className="form-control" rows={3} defaultValue={edit?.description || ''} /></div>
            </div>
            <div className="modal-footer"><button className="btn btn-primary" data-bs-dismiss="modal">Update</button></div>
          </form>
        </div>
      </div>
    </>
  );
}
