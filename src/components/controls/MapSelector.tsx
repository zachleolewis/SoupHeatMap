import type { MatchSummary, MatchDetail } from '../../types'

interface MapSelectorProps {
  availableMaps: { map: string; count: number }[]
  selectedMap: string
  aggregatedMatches: MatchDetail[]
  matches: MatchSummary[]
  selectedMatchIds: string[]
  loading: boolean
  loadingProgress: { processed: number; total: number; percentage: number } | null
  onMapSelect: (mapName: string) => Promise<void>
  onMatchToggle: (matchId: string) => void
  onSelectAllMatches: () => void
  onClearAllMatches: () => void
}

export function MapSelector({
  availableMaps,
  selectedMap,
  aggregatedMatches,
  matches,
  selectedMatchIds,
  loading,
  loadingProgress,
  onMapSelect,
  onMatchToggle,
  onSelectAllMatches,
  onClearAllMatches
}: MapSelectorProps) {
  return (
    <>
      <div className="sidebar-section">
        <h3 className="sidebar-title">Map</h3>
        <select
          value={selectedMap}
          onChange={(e) => onMapSelect(e.target.value)}
          className="select-input"
          disabled={loading}
        >
          <option value="">Select a map...</option>
          {availableMaps.map(({ map, count }) => (
            <option key={map} value={map}>
              {map} ({count} matches)
            </option>
          ))}
        </select>

        {/* Loading Progress Bar */}
        {loadingProgress && (
          <div className="loading-progress">
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
      </div>

      {selectedMap && aggregatedMatches.length > 0 && (
        <div className="sidebar-section">
          <h3 className="sidebar-title">
            Matches ({selectedMatchIds.length}/{aggregatedMatches.length})
          </h3>
          <div className="button-group-mini">
            <button onClick={onSelectAllMatches} className="button-mini">
              All
            </button>
            <button onClick={onClearAllMatches} className="button-mini">
              Clear
            </button>
          </div>
          <div className="match-list">
            {aggregatedMatches.map((match, idx) => {
              // Get representative players from each team (Blue vs Red)
              const blueTeam = match.players.filter(p => p.team === 'Blue').filter(p => !p.is_observer && p.agent)[0]
              const redTeam = match.players.filter(p => p.team === 'Red').filter(p => !p.is_observer && p.agent)[0]

              const playerBlue = blueTeam ? blueTeam.game_name : 'Unknown'
              const playerRed = redTeam ? redTeam.game_name : 'Unknown'

              // Get score from original matches array (MatchSummary has the correct score)
              const matchSummary = matches.find(m => m.match_id === match.match_id)
              const score = matchSummary?.score || `${Math.floor(match.rounds_played / 2)}-${Math.floor(match.rounds_played / 2)}`

              return (
                <label key={match.match_id} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectedMatchIds.includes(match.match_id)}
                    onChange={() => onMatchToggle(match.match_id)}
                    className="checkbox-input"
                  />
                  <span className="weapon-name" title={`${match.winning_team} won ${match.rounds_played} rounds`}>
                    {idx + 1}. {playerBlue} vs {playerRed} - {score} ({match.kill_events.length} events)
                  </span>
                </label>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
