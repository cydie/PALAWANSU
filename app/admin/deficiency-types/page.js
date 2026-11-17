'use client';

import { useEffect, useState } from 'react';
import ModalPortal from '@/components/ModalPortal';
import { api } from '@/lib/client';
import { hideModal, showModal } from '@/lib/bootstrap-ui';

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
    setFlash('Deficiency type updated.');
    await hideModal('editType');
    setEdit(null);
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
              <div className="mb-3">
                <label className="form-label">Applies to</label>
                <select name="applies_to" className="form-select" defaultValue="All">
                  <option value="All">All students</option>
                  <option value="Freshman">Freshman</option>
                  <option value="Transferee">Transferee</option>
                  <option value="Graduating">Graduating</option>
                  <option value="Freshman,Transferee">Freshman & Transferee</option>
                  <option value="Transferee,Graduating">Transferee & Graduating</option>
                </select>
              </div>
              <div className="mb-3"><label className="form-label">Description</label><textarea name="description" className="form-control" rows={3} /></div>
              <button className="btn btn-primary w-100">Save</button>
            </form>
          </div>
        </div>
        <div className="col-lg-8">
          <div className="panel">
            <div className="panel-title">Catalog</div>
            <div className="table-responsive">
              <table className="table align-middle">
                <thead><tr><th>Name</th><th>Required document</th><th>Applies to</th><th>Description</th><th /></tr></thead>
                <tbody>
                  {types.map((t) => (
                    <tr key={t.deficiency_id}>
                      <td>{t.deficiency_name}</td>
                      <td>{t.required_document}</td>
                      <td className="small">{t.applies_to || 'All'}</td>
                      <td className="small text-muted">{t.description}</td>
                      <td className="text-nowrap text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary me-1"
                          onClick={() => {
                            setEdit(t);
                            window.setTimeout(() => showModal('editType'), 0);
                          }}
                        >
                          Edit
                        </button>
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
      <ModalPortal>
        <div className="modal fade" id="editType" tabIndex={-1} aria-hidden="true">
          <div className="modal-dialog modal-dialog-centered modal-fullscreen-sm-down">
            <form className="modal-content" onSubmit={update} key={edit?.deficiency_id || 'closed'}>
              <input type="hidden" name="deficiency_id" value={edit?.deficiency_id || ''} />
              <div className="modal-header">
                <h5 className="modal-title">Edit deficiency type</h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
              </div>
              <div className="modal-body">
                <div className="mb-3"><label className="form-label">Name</label><input name="deficiency_name" className="form-control" defaultValue={edit?.deficiency_name || ''} required /></div>
                <div className="mb-3"><label className="form-label">Required document</label><input name="required_document" className="form-control" defaultValue={edit?.required_document || ''} required /></div>
                <div className="mb-3">
                  <label className="form-label">Applies to</label>
                  <select name="applies_to" className="form-select" defaultValue={edit?.applies_to || 'All'}>
                    <option value="All">All students</option>
                    <option value="Freshman">Freshman</option>
                    <option value="Transferee">Transferee</option>
                    <option value="Graduating">Graduating</option>
                    <option value="Freshman,Transferee">Freshman & Transferee</option>
                    <option value="Transferee,Graduating">Transferee & Graduating</option>
                  </select>
                </div>
                <div className="mb-3"><label className="form-label">Description</label><textarea name="description" className="form-control" rows={3} defaultValue={edit?.description || ''} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" className="btn btn-primary">Update</button>
              </div>
            </form>
          </div>
        </div>
      </ModalPortal>
    </>
  );
}
