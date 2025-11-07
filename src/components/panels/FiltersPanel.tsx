import type { PlayerStats } from '../../types'

interface FiltersPanelProps {
  showFilters: boolean
  onToggleFilters: () => void
  players: PlayerStats[]
  selectedPlayers: string[]
  onPlayerToggle: (playerId: string) => void
  onSelectAllPlayers: () => void
  onClearAllPlayers: () => void
  weapons: { name: string; available: boolean }[]
  selectedWeapons: string[]
  onWeaponToggle: (weapon: string) => void
  onSelectAllWeapons: () => void
  onClearAllWeapons: () => void
  rounds: number[]
  selectedRounds: number[]
  onRoundToggle: (round: number) => void
  onSelectAllRounds: () => void
  onClearAllRounds: () => void
  timeRange: [number, number]
  onTimeRangeChange: (range: [number, number]) => void
  onResetTimeRange: () => void
  filteredEventsCount: number
  totalEventsCount: number
  viewMode: 'single' | 'aggregate'
  selectedMatchIds: string[]
}

export function FiltersPanel({
  showFilters,
  onToggleFilters,
  players,
  selectedPlayers,
  onPlayerToggle,
  onSelectAllPlayers,
  onClearAllPlayers,
  weapons,
  selectedWeapons,
  onWeaponToggle,
  onSelectAllWeapons,
  onClearAllWeapons,
  rounds,
  selectedRounds,
  onRoundToggle,
  onSelectAllRounds,
  onClearAllRounds,
  timeRange,
  onTimeRangeChange,
  onResetTimeRange,
  filteredEventsCount,
  totalEventsCount,
  viewMode,
  selectedMatchIds
}: FiltersPanelProps) {
  return (
    <div className="sidebar-section">
      <button
        onClick={onToggleFilters}
        className="sidebar-title-button"
      >
        <span>Filters</span>
        <span className={`chevron ${showFilters ? 'open' : ''}`}>▼</span>
      </button>

      {showFilters && (
        <>
          {/* Player Filter */}
          <div className="filter-group">
            <label className="filter-label">
              Players {selectedPlayers.length > 0 && `(${selectedPlayers.length})`}
            </label>
            <div className="button-group-mini">
              <button onClick={onSelectAllPlayers} className="button-mini">
                All
              </button>
              <button onClick={onClearAllPlayers} className="button-mini">
                Clear
              </button>
            </div>
            <div className="player-list">
              {players.map((player) => (
                <label key={player.puuid} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectedPlayers.includes(player.puuid)}
                    onChange={() => onPlayerToggle(player.puuid)}
                    className="checkbox-input"
                  />
                  <span className="player-name">{player.game_name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Weapon Filter */}
          <div className="filter-group">
            <label className="filter-label">
              Weapons {selectedWeapons.length > 0 && `(${selectedWeapons.length})`}
            </label>
            <div className="button-group-mini">
              <button onClick={onSelectAllWeapons} className="button-mini">
                All
              </button>
              <button onClick={onClearAllWeapons} className="button-mini">
                Clear
              </button>
            </div>
            <div className="weapon-list">
              {weapons.map((weapon) => (
                <label
                  key={weapon.name}
                  className={`checkbox-label ${!weapon.available ? 'disabled' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedWeapons.includes(weapon.name)}
                    onChange={() => onWeaponToggle(weapon.name)}
                    className="checkbox-input"
                    disabled={!weapon.available}
                  />
                  <span className="weapon-name">{weapon.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Round Filter */}
          <div className="filter-group">
            <label className="filter-label">
              Rounds {selectedRounds.length > 0 && `(${selectedRounds.length})`}
            </label>
            <div className="button-group-mini">
              <button onClick={onSelectAllRounds} className="button-mini">
                All
              </button>
              <button onClick={onClearAllRounds} className="button-mini">
                Clear
              </button>
            </div>
            <div className="rounds-grid">
              {rounds.map((roundNum) => (
                <label key={roundNum} className="round-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedRounds.includes(roundNum)}
                    onChange={() => onRoundToggle(roundNum)}
                    className="checkbox-input"
                  />
                  <span>{roundNum + 1}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Time Range Filter */}
          <div className="filter-group">
            <label className="filter-label">
              Time: {timeRange[0]}s - {timeRange[1]}s
            </label>
            <input
              type="range"
              min="0"
              max="150"
              value={timeRange[0]}
              onChange={(e) => {
                const val = Number(e.target.value)
                if (val <= timeRange[1]) onTimeRangeChange([val, timeRange[1]])
              }}
              className="range-input"
            />
            <input
              type="range"
              min="0"
              max="150"
              value={timeRange[1]}
              onChange={(e) => {
                const val = Number(e.target.value)
                if (val >= timeRange[0]) onTimeRangeChange([timeRange[0], val])
              }}
              className="range-input"
            />
            <button onClick={onResetTimeRange} className="button-mini">
              Reset
            </button>
          </div>

          {/* Filter Summary */}
          <div className="filter-summary">
            {filteredEventsCount} of {totalEventsCount} events
            {viewMode === 'aggregate' && ` • ${selectedMatchIds.length} match${selectedMatchIds.length > 1 ? 'es' : ''}`}
            {selectedPlayers.length > 0 && ` • ${selectedPlayers.length} player${selectedPlayers.length > 1 ? 's' : ''}`}
            {selectedWeapons.length > 0 && ` • ${selectedWeapons.length} weapon${selectedWeapons.length > 1 ? 's' : ''}`}
          </div>
        </>
      )}
    </div>
  )
}
