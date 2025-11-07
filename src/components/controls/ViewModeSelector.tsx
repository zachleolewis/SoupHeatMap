interface ViewModeSelectorProps {
  viewMode: 'single' | 'aggregate'
  hasMatches: boolean
  onViewModeChange: (mode: 'single' | 'aggregate') => void
}

export function ViewModeSelector({ viewMode, hasMatches, onViewModeChange }: ViewModeSelectorProps) {
  if (!hasMatches) return null

  return (
    <div className="sidebar-section">
      <h3 className="sidebar-title">View Mode</h3>
      <div className="button-group">
        <button
          onClick={() => onViewModeChange('single')}
          className={`button-group-item ${viewMode === 'single' ? 'active' : ''}`}
        >
          Single Match
        </button>
        <button
          onClick={() => onViewModeChange('aggregate')}
          className={`button-group-item ${viewMode === 'aggregate' ? 'active' : ''}`}
        >
          Map Aggregate
        </button>
      </div>
    </div>
  )
}
