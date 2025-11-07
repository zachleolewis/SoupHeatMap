import type { MatchSummary } from '../../types'

interface MatchSelectorProps {
  matches: MatchSummary[]
  selectedMatchId: string
  loading: boolean
  loadingProgress: { processed: number; total: number; percentage: number } | null
  onMatchSelect: (matchId: string) => Promise<void>
}

export function MatchSelector({
  matches,
  selectedMatchId,
  loading,
  loadingProgress,
  onMatchSelect
}: MatchSelectorProps) {
  return (
    <div className="sidebar-section">
      <h3 className="sidebar-title">
        Match ({matches.length})
      </h3>

      {/* Loading Progress */}
      {loadingProgress && (
        <div className="loading-progress" style={{ marginBottom: '1rem' }}>
          <div className="loading-text">
            Loading matches... {loadingProgress.processed}/{loadingProgress.total} ({loadingProgress.percentage}%)
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${loadingProgress.percentage}%` }}
            />
          </div>
        </div>
      )}

      <select
        value={selectedMatchId}
        onChange={(e) => onMatchSelect(e.target.value)}
        className="select-input"
        disabled={matches.length === 0 || loading}
      >
        <option value="">
          {loading ? 'Loading matches...' : matches.length === 0 ? 'No matches loaded' : 'Select a match...'}
        </option>
        {matches.map((match) => (
          <option key={match.match_id} value={match.match_id}>
            {match.map} - {match.score}
          </option>
        ))}
      </select>
    </div>
  )
}
