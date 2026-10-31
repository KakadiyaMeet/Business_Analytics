import { useState, useEffect } from 'react'
import { getAdminProfile, updateProfile, changePassword } from '../../../api/adminApi'
import './AdminProfile.css'

function AdminProfile() {
  const [profile, setProfile] = useState(null)
  const [loginHistory, setLoginHistory] = useState([])
  const [loading, setLoading] = useState(true)

  // Profile form
  const [profileForm, setProfileForm] = useState({ username: '', email: '', first_name: '', last_name: '' })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState('')

  // Password form
  const [passForm, setPassForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [passSaving, setPassSaving] = useState(false)
  const [passMsg, setPassMsg] = useState({ text: '', type: '' })

  useEffect(() => {
    getAdminProfile()
      .then(res => {
        const u = res.data.user
        setProfile(u)
        setProfileForm({ username: u.username, email: u.email, first_name: u.first_name || '', last_name: u.last_name || '' })
        setLoginHistory(res.data.login_history || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleProfileSave = async (e) => {
    e.preventDefault()
    setProfileSaving(true)
    setProfileMsg('')
    try {
      await updateProfile(profileForm)
      setProfileMsg('Profile updated successfully.')
    } catch (err) {
      setProfileMsg(err.response?.data?.error || 'Update failed.')
    }
    setProfileSaving(false)
    setTimeout(() => setProfileMsg(''), 4000)
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (passForm.new_password !== passForm.confirm_password) {
      setPassMsg({ text: 'Passwords do not match.', type: 'error' })
      return
    }
    setPassSaving(true)
    setPassMsg({ text: '', type: '' })
    try {
      await changePassword({ current_password: passForm.current_password, new_password: passForm.new_password })
      setPassMsg({ text: 'Password changed successfully.', type: 'success' })
      setPassForm({ current_password: '', new_password: '', confirm_password: '' })
    } catch (err) {
      setPassMsg({ text: err.response?.data?.error || 'Password change failed.', type: 'error' })
    }
    setPassSaving(false)
    setTimeout(() => setPassMsg({ text: '', type: '' }), 4000)
  }

  if (loading) {
    return <div className="state-message"><div className="spinner"></div><div>Loading profile…</div></div>
  }

  return (
    <div className="ap-page">
      <div className="ap-header">
        <div>
          <h1 className="ap-title">Admin Profile</h1>
          <p className="ap-subtitle">Manage your account and security</p>
        </div>
      </div>

      <div className="ap-grid">
        {/* Profile Form */}
        <div className="ap-card">
          <h2 className="ap-card-title">Profile Information</h2>
          {profileMsg && <div className="um-success">{profileMsg}</div>}
          <form onSubmit={handleProfileSave} className="ap-form">
            <div className="ap-form-row">
              <div className="ap-field">
                <label>Username</label>
                <input type="text" value={profileForm.username} onChange={e => setProfileForm(f => ({ ...f, username: e.target.value }))} />
              </div>
              <div className="ap-field">
                <label>Email</label>
                <input type="email" value={profileForm.email} onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))} />
              </div>
            </div>
            <div className="ap-form-row">
              <div className="ap-field">
                <label>First Name</label>
                <input type="text" value={profileForm.first_name} onChange={e => setProfileForm(f => ({ ...f, first_name: e.target.value }))} />
              </div>
              <div className="ap-field">
                <label>Last Name</label>
                <input type="text" value={profileForm.last_name} onChange={e => setProfileForm(f => ({ ...f, last_name: e.target.value }))} />
              </div>
            </div>
            <div className="ap-form-row">
              <div className="ap-field">
                <label>Member Since</label>
                <input type="text" value={profile?.date_joined ? new Date(profile.date_joined).toLocaleDateString() : '—'} disabled />
              </div>
              <div className="ap-field">
                <label>Last Login</label>
                <input type="text" value={profile?.last_login ? new Date(profile.last_login).toLocaleString() : 'Never'} disabled />
              </div>
            </div>
            <button type="submit" className="ap-save-btn" disabled={profileSaving}>
              {profileSaving ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Password Form */}
        <div className="ap-card">
          <h2 className="ap-card-title">Change Password</h2>
          {passMsg.text && (
            <div className={`ap-msg ${passMsg.type}`}>{passMsg.text}</div>
          )}
          <form onSubmit={handlePasswordChange} className="ap-form">
            <div className="ap-field">
              <label>Current Password</label>
              <input type="password" value={passForm.current_password} onChange={e => setPassForm(f => ({ ...f, current_password: e.target.value }))} required />
            </div>
            <div className="ap-field">
              <label>New Password</label>
              <input type="password" value={passForm.new_password} onChange={e => setPassForm(f => ({ ...f, new_password: e.target.value }))} required minLength={6} />
            </div>
            <div className="ap-field">
              <label>Confirm New Password</label>
              <input type="password" value={passForm.confirm_password} onChange={e => setPassForm(f => ({ ...f, confirm_password: e.target.value }))} required />
            </div>
            <button type="submit" className="ap-save-btn" disabled={passSaving}>
              {passSaving ? 'Changing…' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>

      {/* Login History */}
      {loginHistory.length > 0 && (
        <div className="ap-card" style={{ marginTop: 24 }}>
          <h2 className="ap-card-title">Login History</h2>
          <div className="ap-history-table-wrap">
            <table className="dt-table">
              <thead>
                <tr>
                  <th>Date/Time</th>
                  <th>IP Address</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loginHistory.map(log => (
                  <tr key={log.id}>
                    <td>{new Date(log.created_at).toLocaleString()}</td>
                    <td>{log.ip_address || '—'}</td>
                    <td><span className="al-action-badge login">{log.action_display}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminProfile
