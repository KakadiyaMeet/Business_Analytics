import { useState, useEffect, useCallback } from 'react'
import DataTable from '../../../components/DataTable/DataTable'
import ConfirmModal from '../../../components/ConfirmModal/ConfirmModal'
import { getAdminUsers, updateAdminUser, activateUser, deactivateUser, deleteUser } from '../../../api/adminApi'
import './UserManagement.css'

function UserManagement() {
  const [users, setUsers] = useState([])
  const [pagination, setPagination] = useState({})
  const [loading, setLoading] = useState(true)
  const [params, setParams] = useState({ page: 1, search: '', sort_by: '-date_joined' })

  // Modals
  const [deleteModal, setDeleteModal] = useState({ open: false, user: null })
  const [editModal, setEditModal] = useState({ open: false, user: null })
  const [editForm, setEditForm] = useState({})
  const [actionLoading, setActionLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  const fetchUsers = useCallback(() => {
    setLoading(true)
    getAdminUsers(params)
      .then(res => { setUsers(res.data.users); setPagination(res.data.pagination); setLoading(false) })
      .catch(() => setLoading(false))
  }, [params])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const handleSearch = (val) => setParams(p => ({ ...p, search: val, page: 1 }))
  const handleSort = (key) => setParams(p => ({ ...p, sort_by: key }))
  const handlePage = (page) => setParams(p => ({ ...p, page }))
  const handleDateFilter = ({ date_from, date_to }) => setParams(p => ({ ...p, date_from, date_to, page: 1 }))

  const handleToggleActive = async (user) => {
    setActionLoading(true)
    try {
      if (user.is_active) {
        await deactivateUser(user.id)
        setSuccessMsg(`${user.username} deactivated.`)
      } else {
        await activateUser(user.id)
        setSuccessMsg(`${user.username} activated.`)
      }
      fetchUsers()
    } catch(error){
      console.log(error)
    }   
    setActionLoading(false)
    setTimeout(() => setSuccessMsg(''), 3000)
  }

  const handleDelete = async () => {
    if (!deleteModal.user) return
    setActionLoading(true)
    try {
      await deleteUser(deleteModal.user.id)
      setSuccessMsg(`${deleteModal.user.username} deleted.`)
      setDeleteModal({ open: false, user: null })
      fetchUsers()
    } catch(error){
      console.log(error)
    } 
    setActionLoading(false)
    setTimeout(() => setSuccessMsg(''), 3000)
  }

  const openEdit = (user) => {
    setEditForm({ username: user.username, email: user.email, first_name: user.first_name || '', last_name: user.last_name || '' })
    setEditModal({ open: true, user })
  }

  const handleEditSave = async () => {
    if (!editModal.user) return
    setActionLoading(true)
    try {
      await updateAdminUser(editModal.user.id, editForm)
      setSuccessMsg('User updated.')
      setEditModal({ open: false, user: null })
      fetchUsers()
    } catch(error){
      console.log(error)
    }
    setActionLoading(false)
    setTimeout(() => setSuccessMsg(''), 3000)
  }

  const columns = [
    { key: 'username', label: 'Username', sortable: true, render: (row) => <span className="um-username">{row.username}</span> },
    { key: 'email', label: 'Email', sortable: true },
    {
      key: 'is_active', label: 'Status', render: (row) => (
        <span className={`um-status ${row.is_active ? 'active' : 'inactive'}`}>
          {row.is_active ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      key: 'is_staff', label: 'Role', render: (row) => (
        <span className={`um-role ${row.is_staff ? 'admin' : 'user'}`}>
          {row.is_staff ? 'Admin' : 'User'}
        </span>
      )
    },
    { key: 'total_datasets', label: 'Datasets' },
    { key: 'total_predictions', label: 'Predictions' },
    { key: 'date_joined', label: 'Joined', sortable: true, render: (row) => new Date(row.date_joined).toLocaleDateString() },
    {
      key: 'last_login', label: 'Last Login', sortable: true,
      render: (row) => row.last_login ? new Date(row.last_login).toLocaleDateString() : 'Never'
    },
  ]

  return (
    <div className="um-page">
      <div className="um-header">
        <div>
          <h1 className="um-title">User Management</h1>
          <p className="um-subtitle">Manage all registered users</p>
        </div>
      </div>

      {successMsg && <div className="um-success">{successMsg}</div>}

      <DataTable
        columns={columns}
        data={users}
        pagination={pagination}
        onPageChange={handlePage}
        onSearch={handleSearch}
        onSort={handleSort}
        onDateFilter={handleDateFilter}
        searchPlaceholder="Search users…"
        loading={loading}
        emptyText="No users found."
        showDateFilter
        sortBy={params.sort_by}
        actions={(row) => (
          <div className="um-actions">
            <button className="um-action-btn view" onClick={() => openEdit(row)} title="Edit">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            </button>
            <button
              className={`um-action-btn ${row.is_active ? 'deactivate' : 'activate'}`}
              onClick={() => handleToggleActive(row)}
              disabled={actionLoading}
              title={row.is_active ? 'Deactivate' : 'Activate'}
            >
              {row.is_active ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
              )}
            </button>
            <button className="um-action-btn delete" onClick={() => setDeleteModal({ open: true, user: row })} title="Delete">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
            </button>
          </div>
        )}
      />

      {/* Delete Modal */}
      <ConfirmModal
        open={deleteModal.open}
        title="Delete User"
        message={`Are you sure you want to delete "${deleteModal.user?.username}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal({ open: false, user: null })}
        loading={actionLoading}
      />

      {/* Edit Modal */}
      {editModal.open && (
        <div className="confirm-overlay" onClick={() => setEditModal({ open: false, user: null })}>
          <div className="confirm-modal um-edit-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="confirm-title">Edit User</h3>
            <div className="um-edit-form">
              <label>Username</label>
              <input type="text" value={editForm.username} onChange={(e) => setEditForm(f => ({ ...f, username: e.target.value }))} />
              <label>Email</label>
              <input type="email" value={editForm.email} onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))} />
              <label>First Name</label>
              <input type="text" value={editForm.first_name} onChange={(e) => setEditForm(f => ({ ...f, first_name: e.target.value }))} />
              <label>Last Name</label>
              <input type="text" value={editForm.last_name} onChange={(e) => setEditForm(f => ({ ...f, last_name: e.target.value }))} />
            </div>
            <div className="confirm-actions">
              <button className="confirm-btn cancel" onClick={() => setEditModal({ open: false, user: null })}>Cancel</button>
              <button className="confirm-btn primary" onClick={handleEditSave} disabled={actionLoading}>
                {actionLoading ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserManagement
