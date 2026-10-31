import { Link } from 'react-router-dom'
import './EmptyState.css'

const defaultIcon = (
  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
)

function EmptyState({
  icon,
  title = 'No Dataset Uploaded',
  description = "You haven't uploaded a dataset yet. Upload a CSV file to start exploring your data, generate visualizations, make predictions, and create reports.",
  skills,
}) {
  return (
    <div className="empty-state-wrapper">
      <div className="empty-state-card">
        <div className="empty-state-icon-container">
          {icon || defaultIcon}
        </div>
        <h2 className="empty-state-title">{title}</h2>
        <p className="empty-state-desc">{description}</p>
        
        {skills && skills.length > 0 && (
          <div className="empty-state-skills">
            {skills.map((skill, idx) => (
              <span key={idx} className="empty-state-skill-badge">{skill}</span>
            ))}
          </div>
        )}
        
        <Link to="/upload" className="empty-state-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Upload Dataset
        </Link>
      </div>
    </div>
  )
}

export default EmptyState
