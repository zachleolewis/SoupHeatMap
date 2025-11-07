import { useState, useMemo, useEffect } from 'react'
import './App.css'
import { selectFolder, loadMatchesWithProgress, getMatchDetail, getMultipleMatchDetailsWithProgress } from './lib/tauri-api'
import { saveImageFile } from './lib/export-utils'
import type { MatchSummary, MatchDetail } from './types'
import { Heatmap } from './components/Heatmap'
import { OverlayToolbar } from './components/OverlayToolbar'
import type { OverlayElement } from './components/OverlayCanvas'

function App() {
  const [folderPath, setFolderPath] = useState<string | null>(null)
  const [matches, setMatches] = useState<MatchSummary[]>([])
  const [selectedMatch, setSelectedMatch] = useState<MatchDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState<{ processed: number; total: number; percentage: number } | null>(null)
  const [loadingMatchDetails, setLoadingMatchDetails] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [debugMode, setDebugMode] = useState(false)
  const [debugLogs, setDebugLogs] = useState<string[]>([])
  const [aggregateLoadingProgress, setAggregateLoadingProgress] = useState<{ processed: number; total: number; percentage: number } | null>(null)
  const [processingFilters, setProcessingFilters] = useState(false)

  // Debug logging function
  const addDebugLog = (message: string) => {
    if (debugMode) {
      const timestamp = new Date().toLocaleTimeString()
      setDebugLogs(prev => [...prev.slice(-9), `[${timestamp}] ${message}`]) // Keep last 10 logs
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+D to toggle debug mode
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault()
        setDebugMode(prev => !prev)
        addDebugLog(`Debug mode ${!debugMode ? 'enabled' : 'disabled'}`)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [debugMode])

  // View mode state
  const [viewMode, setViewMode] = useState<'single' | 'aggregate'>('single')
  const [selectedMap, setSelectedMap] = useState<string>('')
  const [selectedMatchIds, setSelectedMatchIds] = useState<string[]>([])
  const [aggregatedMatches, setAggregatedMatches] = useState<MatchDetail[]>([])
  
  // Filter state
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [selectedWeapons, setSelectedWeapons] = useState<string[]>([])
  const [selectedRounds, setSelectedRounds] = useState<number[]>([])
  const [timeRange, setTimeRange] = useState<[number, number]>([0, 150])
  
  // Heatmap visualization state
  const [showMode, setShowMode] = useState<'kills' | 'deaths' | 'both'>('kills')
  const [styleMode, setStyleMode] = useState<'heatmap' | 'points'>('heatmap')
  const [bandwidth, setBandwidth] = useState<number>(5)
  const [opacity, setOpacity] = useState<number>(0.7)
  const [showArrows, setShowArrows] = useState<boolean>(true)
  const [showContext, setShowContext] = useState<boolean>(false)
  
  // Color customization state (using red/blue Valorant defaults)
  const [colorLow, setColorLow] = useState<string>("#0a244d")
  const [colorHigh, setColorHigh] = useState<string>("#FF4655") // Default red
  const [colorKillsLow, setColorKillsLow] = useState<string>("#0a244d")
  const [colorKillsHigh, setColorKillsHigh] = useState<string>("#FF4655") // Default red
  const [colorDeathsLow, setColorDeathsLow] = useState<string>("#0a244d")
  const [colorDeathsHigh, setColorDeathsHigh] = useState<string>("#4455FF") // Default blue
  const [colorKillerDot, setColorKillerDot] = useState<string>("#FF4655") // Default red
  const [colorVictimDot, setColorVictimDot] = useState<string>("#4455FF") // Default blue
  
  // UI state - collapsible panels
  const [showFilters, setShowFilters] = useState<boolean>(true)
  const [showVisualization, setShowVisualization] = useState<boolean>(true)
  const [showColorCustomization, setShowColorCustomization] = useState<boolean>(false)
  const [independentModeColors, setIndependentModeColors] = useState<boolean>(false) // Heatmap vs Points independence
  const [independentKillsDeaths, setIndependentKillsDeaths] = useState<boolean>(false) // Kills vs Deaths independence

  // Overlay state for interactive elements
  const [overlayElements, setOverlayElements] = useState<OverlayElement[]>([])
  const [selectedTool, setSelectedTool] = useState<string>('select')
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)

  // Export panel state
  const [showExport, setShowExport] = useState<boolean>(false)
  const [exportFormat, setExportFormat] = useState<'png' | 'jpg' | 'gif'>('png')
  const [exportTransparent, setExportTransparent] = useState<boolean>(true)
  const [exportQuality, setExportQuality] = useState<number>(0.9)

  const handleSelectFolder = async () => {
    try {
      setError(null)
      setLoading(true)
      setLoadingProgress(null)

      const path = await selectFolder()
      setFolderPath(path)

      // Load all matches with simple progress indication
      const loadedMatches = await loadMatchesWithProgress(path, (progress) => {
        setLoadingProgress(progress)
      })

      setMatches(loadedMatches)
      setLoadingProgress(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setLoadingProgress(null)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectMatch = async (matchId: string) => {
    if (!folderPath) return

    try {
      setError(null)
      setLoadingMatchDetails(true)

      // Clear aggregated data when switching to single match view
      if (viewMode === 'aggregate') {
        setAggregatedMatches([])
        setSelectedMatchIds([])
        setSelectedMap('')
      }

      const detail = await getMatchDetail(folderPath, matchId)
      setSelectedMatch(detail)
      
      // Select ALL filters by default when new match selected
      const allPlayers = detail.players.filter(p => !p.is_observer && p.agent).map(p => p.puuid)
      setSelectedPlayers(allPlayers)
      
      const allWeapons = Array.from(new Set(
        detail.kill_events.map(e => e.weapon).filter((w): w is string => w !== null && w !== 'Unknown')
      ))
      setSelectedWeapons(allWeapons)
      
      const allRounds = Array.from(new Set(detail.kill_events.map(e => e.round_num))).sort((a, b) => a - b)
      setSelectedRounds(allRounds)
      
      setTimeRange([0, 150])

    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoadingMatchDetails(false)
    }
  }

  // Handle map selection in aggregate mode
  const handleSelectMap = async (mapName: string) => {
    if (!folderPath || !mapName) return

    try {
      setError(null)
      setLoading(true)
      setLoadingProgress(null)
      setSelectedMap(mapName)

      // Get all matches for this map
      const mapMatches = matches.filter(m => m.map === mapName)
      const matchIds = mapMatches.map(m => m.match_id)

      // Select all by default
      setSelectedMatchIds(matchIds)

      // Load all match details with controlled batching and progress updates
      addDebugLog(`Starting aggregate loading: ${matchIds.length} matches for map "${mapName}"`)

      setAggregateLoadingProgress({
        processed: 0,
        total: matchIds.length,
        percentage: 0
      })

      const startTime = Date.now()
      const matchDetails = await getMultipleMatchDetailsWithProgress(
        folderPath,
        matchIds,
        (progress) => {
          setAggregateLoadingProgress(progress)
          addDebugLog(`Aggregate loading: ${progress.processed}/${progress.total} (${progress.percentage}%)`)
        }
      )

      const loadTime = Date.now() - startTime
      addDebugLog(`Aggregate loading completed: ${matchDetails.length} matches in ${loadTime}ms`)

      setAggregateLoadingProgress({
        processed: matchIds.length,
        total: matchIds.length,
        percentage: 100
      })

      // Small delay to show completion
      setTimeout(() => {
        setAggregateLoadingProgress(null)
        setLoadingProgress(null)
      }, 500)

      // Set matches first, then process filters asynchronously to prevent UI blocking
      setAggregatedMatches(matchDetails)

      // Process filter data asynchronously to prevent UI freezing
      setTimeout(() => {
        setProcessingFilters(true)
        addDebugLog(`Processing filter data for ${matchDetails.length} matches...`)

        try {
          // Process players
          const allPlayers = Array.from(new Set(matchDetails.flatMap(m => m.players).map(p => p.puuid)))
          setSelectedPlayers(allPlayers)
          addDebugLog(`Processed ${allPlayers.length} unique players`)

          // Process weapons in chunks to avoid blocking
          setTimeout(() => {
            const allWeapons = Array.from(new Set(
              matchDetails.flatMap(m => m.kill_events.map(e => e.weapon)).filter((w): w is string => w !== null && w !== 'Unknown')
            ))
            setSelectedWeapons(allWeapons)
            addDebugLog(`Processed ${allWeapons.length} unique weapons`)

            // Process rounds in chunks
            setTimeout(() => {
              const allRounds = Array.from(new Set(matchDetails.flatMap(m => m.kill_events.map(e => e.round_num)))).sort((a, b) => a - b)
              setSelectedRounds(allRounds)
              setTimeRange([0, 150])
              addDebugLog(`Processed ${allRounds.length} rounds. Filter processing complete.`)
              setProcessingFilters(false)
            }, 10)
          }, 10)
        } catch (err) {
          console.error('Error processing filter data:', err)
          addDebugLog(`Error processing filter data: ${err}`)
          setProcessingFilters(false)
        }
      }, 100) // Small delay to allow UI to update first
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
      setLoadingProgress(null)
    }
  }

  // Get current match data (single or aggregated)
  const currentMatchData = useMemo(() => {
    if (viewMode === 'single') {
      return selectedMatch ? {
        map: selectedMatch.map,
        kill_events: selectedMatch.kill_events,
        players: selectedMatch.players
      } : null
    } else {
      // Aggregate mode
      if (aggregatedMatches.length === 0) return null
      
      // Filter to only selected matches
      const selectedMatches = aggregatedMatches.filter(m => 
        selectedMatchIds.includes(m.match_id)
      )
      
      if (selectedMatches.length === 0) return null
      
      // Combine all kill events
      const allKillEvents = selectedMatches.flatMap(m => m.kill_events)
      
      // Combine all players (deduplicate by PUUID)
      const playerMap = new Map()
      selectedMatches.forEach(match => {
        match.players.forEach(player => {
          if (!playerMap.has(player.puuid)) {
            playerMap.set(player.puuid, player)
          }
        })
      })
      
      return {
        map: selectedMap,
        kill_events: allKillEvents,
        players: Array.from(playerMap.values())
      }
    }
  }, [viewMode, selectedMatch, aggregatedMatches, selectedMatchIds, selectedMap])

  // Create player map for tooltips
  const playerMap = useMemo(() => {
    if (!currentMatchData) return new Map()
    
    const map = new Map()
    currentMatchData.players.forEach(player => {
      map.set(player.puuid, {
        name: `${player.game_name}#${player.tag_line}`,
        agent: player.agent || 'Unknown',
        team: player.team
      })
    })
    return map
  }, [currentMatchData])

  // Get players (filter out observers)
  const players = useMemo(() => {
    if (!currentMatchData) return []
    return currentMatchData.players.filter(p => !p.is_observer && p.agent)
  }, [currentMatchData])
  
  // Get available maps for aggregate view
  const availableMaps = useMemo(() => {
    const mapCounts = new Map<string, number>()
    matches.forEach(match => {
      mapCounts.set(match.map, (mapCounts.get(match.map) || 0) + 1)
    })
    return Array.from(mapCounts.entries())
      .sort((a, b) => b[1] - a[1]) // Sort by count descending
      .map(([map, count]) => ({ map, count }))
  }, [matches])

  // Get all Valorant weapons with availability status
  const weapons = useMemo(() => {
    if (!currentMatchData) return []
    
    // Get weapons actually used
    const usedWeapons = new Set(
      currentMatchData.kill_events
        .map(e => e.weapon)
        .filter((w): w is string => w !== null && w !== 'Unknown')
    )
    
    // All Valorant weapons
    const allWeapons = [
      'Vandal', 'Phantom', 'Operator', 'Sheriff', 'Ghost', 
      'Classic', 'Frenzy', 'Spectre', 'Stinger', 'Guardian',
      'Bulldog', 'Marshal', 'Odin', 'Ares', 'Judge', 'Bucky',
      'Shorty', 'Knife', 'Melee', 'Ability'
    ]
    
    // Map to objects with availability info
    return allWeapons.map(weapon => ({
      name: weapon,
      available: usedWeapons.has(weapon)
    })).sort((a, b) => {
      // Sort: available first, then alphabetically
      if (a.available && !b.available) return -1
      if (!a.available && b.available) return 1
      return a.name.localeCompare(b.name)
    })
  }, [currentMatchData])

  // Get unique rounds
  const rounds = useMemo(() => {
    if (!currentMatchData) return []
    return Array.from(new Set(currentMatchData.kill_events.map(e => e.round_num))).sort((a, b) => a - b)
  }, [currentMatchData])

  // Apply filters to kill events
  const filteredKillEvents = useMemo(() => {
    if (!currentMatchData) return []
    
    let filtered = currentMatchData.kill_events

    // Player filtering (mode-aware) - only filter if some players deselected
    const allPlayerPuuids = currentMatchData.players.filter(p => !p.is_observer && p.agent).map(p => p.puuid)
    if (selectedPlayers.length === 0) {
      // No players selected = show nothing
      filtered = []
    } else if (selectedPlayers.length < allPlayerPuuids.length) {
      // Some players selected = filter by them
      if (showMode === 'kills') {
        filtered = filtered.filter(event => selectedPlayers.includes(event.killer_puuid))
      } else if (showMode === 'deaths') {
        filtered = filtered.filter(event => selectedPlayers.includes(event.victim_puuid))
      } else {
        filtered = filtered.filter(
          event => selectedPlayers.includes(event.killer_puuid) || selectedPlayers.includes(event.victim_puuid)
        )
      }
    }
    // If all players selected, don't filter (show all)

    // Weapon filtering - only filter if some weapons deselected
    const allMatchWeapons = Array.from(new Set(
      currentMatchData.kill_events.map(e => e.weapon).filter((w): w is string => w !== null && w !== 'Unknown')
    ))
    if (selectedWeapons.length === 0) {
      // No weapons selected = show nothing
      filtered = []
    } else if (selectedWeapons.length < allMatchWeapons.length) {
      // Some weapons selected = filter by them
      filtered = filtered.filter(event => event.weapon && selectedWeapons.includes(event.weapon))
    }
    // If all weapons selected, don't filter (show all)

    // Round filtering
    if (selectedRounds.length === 0) {
      filtered = []
    } else {
      filtered = filtered.filter(event => selectedRounds.includes(event.round_num))
    }

    // Time range filtering
    filtered = filtered.filter(event => {
      const timeInSeconds = event.round_time_millis / 1000
      return timeInSeconds >= timeRange[0] && timeInSeconds <= timeRange[1]
    })

    return filtered
  }, [currentMatchData, selectedPlayers, selectedWeapons, selectedRounds, timeRange, showMode])

  // Handle export functionality
  const handleExport = async () => {
    try {
      const svgElement = document.querySelector('.heatmap-svg') as SVGSVGElement;
      if (!svgElement) {
        console.error('SVG element not found');
        return;
      }

      // Create canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('Could not get canvas context');
        return;
      }

      // Set canvas size
      canvas.width = 1024;
      canvas.height = 1024;

      // Get map image URL
      const { getMapImageUrl } = await import('./lib/coordinateTransform');
      const mapImageUrl = currentMatchData ? getMapImageUrl(currentMatchData.map) : null;

      // Load images in sequence: map background first, then heatmap SVG
      const loadImage = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = src;
        });
      };

      const imagesToLoad: Promise<HTMLImageElement>[] = [];
      let mapImage: HTMLImageElement | null = null;
      let svgImage: HTMLImageElement | null = null;

      // Load map image if we have match data
      if (mapImageUrl) {
        const mapImgPromise = loadImage(mapImageUrl);
        imagesToLoad.push(mapImgPromise);
        mapImgPromise.then(img => mapImage = img);
      }

      // Create SVG without the image element (since we're drawing map separately)
      const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
      const imageElement = clonedSvg.querySelector('image');
      if (imageElement) {
        imageElement.remove(); // Remove the image element since we draw it separately
      }

      const svgData = new XMLSerializer().serializeToString(clonedSvg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      const svgImgPromise = loadImage(svgUrl);
      imagesToLoad.push(svgImgPromise);
      svgImgPromise.then(img => svgImage = img);

      // Wait for all images to load
      await Promise.all(imagesToLoad);

      // Draw background
      if (exportFormat === 'png' && !exportTransparent) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (exportFormat === 'jpg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Draw map image first (background)
      if (mapImage) {
        ctx.globalAlpha = 0.8; // Match the opacity used in the SVG
        ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1.0; // Reset alpha
      }

      // Draw SVG content (heatmap/points)
      if (svgImage) {
        ctx.drawImage(svgImage, 0, 0);
      }

      // Draw overlay canvas if it exists
      const overlayCanvas = document.querySelector('canvas') as HTMLCanvasElement;
      if (overlayCanvas && overlayElements.length > 0) {
        ctx.drawImage(overlayCanvas, 0, 0);
      }

      // Convert to blob and save
      canvas.toBlob(async (blob) => {
        if (blob) {
          await saveImageFile(blob, {
            format: exportFormat,
            transparent: exportTransparent,
            quality: exportQuality
          });
        }
      }, exportFormat === 'jpg' ? 'image/jpeg' : 'image/png', exportFormat === 'jpg' ? exportQuality : undefined);

      URL.revokeObjectURL(svgUrl);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Update CSS custom properties for dynamic theming based on ACTUAL heatmap colors
  useEffect(() => {
    let primaryLow, primaryHigh, secondaryHigh;

    if (styleMode === 'heatmap') {
      if (showMode === 'both') {
        // Both mode: Use both gradients
        primaryLow = colorKillsLow;
        primaryHigh = colorKillsHigh;
        secondaryHigh = colorDeathsHigh;
      } else if (independentKillsDeaths) {
        // Independent kills/deaths: Use specific gradient for current mode
        if (showMode === 'kills') {
          primaryLow = colorKillsLow;
          primaryHigh = colorKillsHigh;
          secondaryHigh = colorKillsHigh;
        } else {
          primaryLow = colorDeathsLow;
          primaryHigh = colorDeathsHigh;
          secondaryHigh = colorDeathsHigh;
        }
      } else {
        // Linked kills/deaths: Use single gradient (colorLow → colorHigh)
        primaryLow = colorLow;
        primaryHigh = colorHigh;
        secondaryHigh = colorHigh;
      }
    } else {
      // Points mode: Use dot colors
      primaryLow = colorKillerDot;
      primaryHigh = colorKillerDot;
      secondaryHigh = colorVictimDot;
    }

    document.documentElement.style.setProperty('--gradient-start', primaryLow);
    document.documentElement.style.setProperty('--gradient-mid', primaryHigh);
    document.documentElement.style.setProperty('--gradient-end', secondaryHigh);
  }, [styleMode, showMode, colorLow, colorHigh, colorKillsLow, colorKillsHigh,
      colorDeathsLow, colorDeathsHigh, colorKillerDot, colorVictimDot, independentKillsDeaths]);

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div>
          <h1 className="app-title">SoupHeatMap</h1>
          <p className="app-subtitle">Valorant Match Analytics</p>
        </div>
        <button 
          onClick={handleSelectFolder} 
          className="button-primary button-compact"
          disabled={loading}
        >
          {loading ? 'Loading...' : folderPath ? 'Change Folder' : 'Choose Folder'}
        </button>
      </header>

      {error && (
        <div className="error-banner">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Main Layout */}
      <div className="main-layout">
        {/* Left Sidebar */}
        <aside className="sidebar">
          {/* View Mode Selection */}
          {matches.length > 0 && (
            <div className="sidebar-section">
              <h3 className="sidebar-title">View Mode</h3>
              <div className="button-group">
                <button
                  onClick={() => setViewMode('single')}
                  className={`button-group-item ${viewMode === 'single' ? 'active' : ''}`}
                >
                  Single Match
                </button>
                <button
                  onClick={() => setViewMode('aggregate')}
                  className={`button-group-item ${viewMode === 'aggregate' ? 'active' : ''}`}
                >
                  Map Aggregate
                </button>
              </div>
            </div>
          )}

          {/* Single Match Selection */}
          {viewMode === 'single' && (
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
                    ></div>
                  </div>
                </div>
              )}

              <select
                value={selectedMatch?.match_id || ''}
                onChange={(e) => handleSelectMatch(e.target.value)}
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
          )}

          {/* Aggregate Map Selection */}
          {viewMode === 'aggregate' && (
            <>
              <div className="sidebar-section">
                <h3 className="sidebar-title">Map</h3>
                <select
                  value={selectedMap}
                  onChange={(e) => handleSelectMap(e.target.value)}
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
                      ></div>
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
                    <button 
                      onClick={() => setSelectedMatchIds(aggregatedMatches.map(m => m.match_id))}
                      className="button-mini"
                    >
                      All
                    </button>
                    <button 
                      onClick={() => setSelectedMatchIds([])}
                      className="button-mini"
                    >
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
                            onChange={() => {
                              setSelectedMatchIds(prev =>
                                prev.includes(match.match_id)
                                  ? prev.filter(id => id !== match.match_id)
                                  : [...prev, match.match_id]
                              )
                            }}
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
          )}

          {currentMatchData && (
            <>
              {/* Filters Section */}
              <div className="sidebar-section">
                <button 
                  onClick={() => setShowFilters(!showFilters)}
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
                    <button 
                      onClick={() => setSelectedPlayers(players.map(p => p.puuid))}
                      className="button-mini"
                    >
                      All
                    </button>
                    <button 
                      onClick={() => setSelectedPlayers([])}
                      className="button-mini"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="player-list">
                    {players.map((player) => (
                      <label key={player.puuid} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={selectedPlayers.includes(player.puuid)}
                          onChange={() => {
                            setSelectedPlayers(prev =>
                              prev.includes(player.puuid)
                                ? prev.filter(p => p !== player.puuid)
                                : [...prev, player.puuid]
                            )
                          }}
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
                    <button 
                      onClick={() => setSelectedWeapons(weapons.filter(w => w.available).map(w => w.name))}
                      className="button-mini"
                    >
                      All
                    </button>
                    <button 
                      onClick={() => setSelectedWeapons([])}
                      className="button-mini"
                    >
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
                          onChange={() => {
                            if (!weapon.available) return
                            setSelectedWeapons(prev =>
                              prev.includes(weapon.name)
                                ? prev.filter(w => w !== weapon.name)
                                : [...prev, weapon.name]
                            )
                          }}
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
                    <button 
                      onClick={() => setSelectedRounds([...rounds])}
                      className="button-mini"
                    >
                      All
                    </button>
                    <button 
                      onClick={() => setSelectedRounds([])}
                      className="button-mini"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="rounds-grid">
                    {rounds.map((roundNum) => (
                      <label key={roundNum} className="round-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedRounds.includes(roundNum)}
                          onChange={() => {
                            setSelectedRounds(prev =>
                              prev.includes(roundNum)
                                ? prev.filter(r => r !== roundNum)
                                : [...prev, roundNum]
                            )
                          }}
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
                      if (val <= timeRange[1]) setTimeRange([val, timeRange[1]])
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
                      if (val >= timeRange[0]) setTimeRange([timeRange[0], val])
                    }}
                    className="range-input"
                  />
                  <button 
                    onClick={() => setTimeRange([0, 150])}
                    className="button-mini"
                  >
                    Reset
                  </button>
                </div>

                {/* Filter Summary */}
                <div className="filter-summary">
                  {filteredKillEvents.length} of {currentMatchData.kill_events.length} events
                  {viewMode === 'aggregate' && ` • ${selectedMatchIds.length} match${selectedMatchIds.length > 1 ? 'es' : ''}`}
                  {selectedPlayers.length > 0 && ` • ${selectedPlayers.length} player${selectedPlayers.length > 1 ? 's' : ''}`}
                  {selectedWeapons.length > 0 && ` • ${selectedWeapons.length} weapon${selectedWeapons.length > 1 ? 's' : ''}`}
                </div>
                </>
                )}
              </div>

              {/* Visualization Section */}
              <div className="sidebar-section">
                <button 
                  onClick={() => setShowVisualization(!showVisualization)}
                  className="sidebar-title-button"
                >
                  <span>Visualization</span>
                  <span className={`chevron ${showVisualization ? 'open' : ''}`}>▼</span>
                </button>
                
                {showVisualization && (
                <>
                
                {/* Show Mode */}
                <div className="filter-group">
                  <label className="filter-label">Show</label>
                  <div className="button-group">
                    {['kills', 'deaths', 'both'].map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setShowMode(mode as any)}
                        className={`button-group-item ${showMode === mode ? 'active' : ''}`}
                      >
                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Style Mode */}
                <div className="filter-group">
                  <label className="filter-label">Style</label>
                  <div className="button-group">
                    <button
                      onClick={() => setStyleMode('heatmap')}
                      className={`button-group-item ${styleMode === 'heatmap' ? 'active' : ''}`}
                    >
                      Heatmap
                    </button>
                    <button
                      onClick={() => setStyleMode('points')}
                      className={`button-group-item ${styleMode === 'points' ? 'active' : ''}`}
                    >
                      Points
                    </button>
                  </div>
                </div>

                {/* Toggles */}
                {styleMode === 'points' && (
                  <>
                    <label className="checkbox-label-inline">
                      <input
                        type="checkbox"
                        checked={showArrows}
                        onChange={(e) => setShowArrows(e.target.checked)}
                        className="checkbox-input"
                      />
                      Show Arrows
                    </label>
                  </>
                )}
                
                {selectedPlayers.length > 0 && styleMode === 'points' && (
                  <label className="checkbox-label-inline">
                    <input
                      type="checkbox"
                      checked={showContext}
                      onChange={(e) => setShowContext(e.target.checked)}
                      className="checkbox-input"
                    />
                    Show Context
                  </label>
                )}

                {/* Sliders */}
                {styleMode === 'heatmap' && (
                  <div className="filter-group">
                    <label className="filter-label">Density: {bandwidth}</label>
                    <div className="slider-with-reset">
                      <input
                        type="range"
                        min="1"
                        max="100"
                        value={bandwidth}
                        onChange={(e) => setBandwidth(Number(e.target.value))}
                        className="range-input"
                      />
                      <button onClick={() => setBandwidth(5)} className="reset-button">↺</button>
                    </div>
                  </div>
                )}

                <div className="filter-group">
                  <label className="filter-label">Opacity: {(opacity * 100).toFixed(0)}%</label>
                  <div className="slider-with-reset">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={opacity}
                      onChange={(e) => setOpacity(Number(e.target.value))}
                      className="range-input"
                    />
                    <button onClick={() => setOpacity(0.7)} className="reset-button">↺</button>
                  </div>
                </div>
                </>
                )}
              </div>

              {/* Customization Section */}
              <div className="sidebar-section">
                <button 
                  onClick={() => setShowColorCustomization(!showColorCustomization)}
                  className="sidebar-title-button"
                >
                  <span>Colors</span>
                  <span className={`chevron ${showColorCustomization ? 'open' : ''}`}>▼</span>
                </button>
                
                {showColorCustomization && (
                  <div className="color-customization">
                    {/* Independent Colors Toggles */}
                    <div style={{ marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label className="checkbox-label-inline">
                        <input
                          type="checkbox"
                          checked={independentModeColors}
                          onChange={(e) => setIndependentModeColors(e.target.checked)}
                          className="checkbox-input"
                        />
                        <span style={{ fontSize: '0.75rem' }}>Independent Heatmap/Points</span>
                      </label>
                      <label className="checkbox-label-inline">
                        <input
                          type="checkbox"
                          checked={independentKillsDeaths}
                          onChange={(e) => setIndependentKillsDeaths(e.target.checked)}
                          className="checkbox-input"
                        />
                        <span style={{ fontSize: '0.75rem' }}>Independent Kills/Deaths</span>
                      </label>
                    </div>

                    {/* Heatmap Colors - Single Mode */}
                    {styleMode === 'heatmap' && showMode !== 'both' && (
                      <>
                        {independentKillsDeaths ? (
                          /* Show mode-specific pickers when independent */
                          showMode === 'kills' ? (
                            <div className="color-group">
                              <label className="color-label">Kills Heatmap</label>
                              <div className="color-picker-row">
                                <input
                                  type="color"
                                  value={colorKillsLow}
                                  onChange={(e) => setColorKillsLow(e.target.value)}
                                  className="color-input"
                                  title="Low intensity"
                                />
                                <div className="color-gradient" style={{
                                  background: `linear-gradient(to right, ${colorKillsLow}, ${colorKillsHigh})`
                                }} />
                                <input
                                  type="color"
                                  value={colorKillsHigh}
                                  onChange={(e) => {
                                    setColorKillsHigh(e.target.value)
                                    if (!independentModeColors) {
                                      setColorKillerDot(e.target.value)
                                    }
                                  }}
                                  className="color-input"
                                  title="High intensity"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="color-group">
                              <label className="color-label">Deaths Heatmap</label>
                              <div className="color-picker-row">
                                <input
                                  type="color"
                                  value={colorDeathsLow}
                                  onChange={(e) => setColorDeathsLow(e.target.value)}
                                  className="color-input"
                                  title="Low intensity"
                                />
                                <div className="color-gradient" style={{
                                  background: `linear-gradient(to right, ${colorDeathsLow}, ${colorDeathsHigh})`
                                }} />
                                <input
                                  type="color"
                                  value={colorDeathsHigh}
                                  onChange={(e) => {
                                    setColorDeathsHigh(e.target.value)
                                    if (!independentModeColors) {
                                      setColorVictimDot(e.target.value)
                                    }
                                  }}
                                  className="color-input"
                                  title="High intensity"
                                />
                              </div>
                            </div>
                          )
                        ) : (
                          /* Show shared picker when linked */
                          <div className="color-group">
                            <label className="color-label">Heatmap</label>
                            <div className="color-picker-row">
                              <input
                                type="color"
                                value={colorLow}
                                onChange={(e) => setColorLow(e.target.value)}
                                className="color-input"
                                title="Low intensity"
                              />
                              <div className="color-gradient" style={{
                                background: `linear-gradient(to right, ${colorLow}, ${colorHigh})`
                              }} />
                              <input
                                type="color"
                                value={colorHigh}
                                onChange={(e) => {
                                  const newColor = e.target.value
                                  setColorHigh(newColor)
                                  
                                  // Link to points if not independent
                                  if (!independentModeColors) {
                                    if (showMode === 'kills') {
                                      setColorKillerDot(newColor)
                                    } else if (showMode === 'deaths') {
                                      setColorVictimDot(newColor)
                                    }
                                  }
                                  
                                  // Sync both kills and deaths when linked
                                  setColorKillsHigh(newColor)
                                  setColorDeathsHigh(newColor)
                                }}
                                className="color-input"
                                title="High intensity"
                              />
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Both Mode Colors */}
                    {styleMode === 'heatmap' && showMode === 'both' && (
                      <>
                        <div className="color-group">
                          <label className="color-label">Kills</label>
                          <div className="color-picker-row">
                            <input
                              type="color"
                              value={colorKillsLow}
                              onChange={(e) => setColorKillsLow(e.target.value)}
                              className="color-input"
                            />
                            <div className="color-gradient" style={{
                              background: `linear-gradient(to right, ${colorKillsLow}, ${colorKillsHigh})`
                            }} />
                            <input
                              type="color"
                              value={colorKillsHigh}
                              onChange={(e) => {
                                setColorKillsHigh(e.target.value)
                                if (!independentModeColors) {
                                  setColorKillerDot(e.target.value)
                                }
                              }}
                              className="color-input"
                            />
                          </div>
                        </div>
                        <div className="color-group">
                          <label className="color-label">Deaths</label>
                          <div className="color-picker-row">
                            <input
                              type="color"
                              value={colorDeathsLow}
                              onChange={(e) => setColorDeathsLow(e.target.value)}
                              className="color-input"
                            />
                            <div className="color-gradient" style={{
                              background: `linear-gradient(to right, ${colorDeathsLow}, ${colorDeathsHigh})`
                            }} />
                            <input
                              type="color"
                              value={colorDeathsHigh}
                              onChange={(e) => {
                                setColorDeathsHigh(e.target.value)
                                if (!independentModeColors) {
                                  setColorVictimDot(e.target.value)
                                }
                              }}
                              className="color-input"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {/* Points Mode Colors */}
                    {styleMode === 'points' && (
                      <div className="color-group">
                        <label className="color-label">Dots</label>
                        <div className="color-picker-row">
                          <div className="color-item">
                            <span className="color-item-label">K</span>
                            <input
                              type="color"
                              value={colorKillerDot}
                              onChange={(e) => {
                                setColorKillerDot(e.target.value)
                                if (!independentModeColors) {
                                  if (showMode === 'both') {
                                    setColorKillsHigh(e.target.value)
                                  } else {
                                    setColorHigh(e.target.value)
                                  }
                                }
                              }}
                              className="color-input"
                            />
                          </div>
                          <div className="color-item">
                            <span className="color-item-label">V</span>
                            <input
                              type="color"
                              value={colorVictimDot}
                              onChange={(e) => {
                                setColorVictimDot(e.target.value)
                                if (!independentModeColors) {
                                  setColorDeathsHigh(e.target.value)
                                }
                              }}
                              className="color-input"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Export Panel */}
          {currentMatchData && (
            <div className="sidebar-section">
              <button
                onClick={() => setShowExport(!showExport)}
                className="sidebar-title-button"
              >
                <span>Export</span>
                <span className={`chevron ${showExport ? 'open' : ''}`}>▼</span>
              </button>

              {showExport && (
                <div className="export-panel">
                  {/* Overlay Tools */}
                  <OverlayToolbar
                    selectedTool={selectedTool}
                    onToolChange={setSelectedTool}
                    onDeleteSelected={() => {
                      if (selectedElementId) {
                        setOverlayElements(overlayElements.filter(el => el.id !== selectedElementId));
                        setSelectedElementId(null);
                      }
                    }}
                    hasSelection={!!selectedElementId}
                    elementsCount={overlayElements.length}
                    selectedElement={overlayElements.find(el => el.id === selectedElementId)}
                    onElementUpdate={(id, updates) => {
                      setOverlayElements(overlayElements.map(el =>
                        el.id === id ? { ...el, ...updates } : el
                      ));
                    }}
                  />

                  {/* Export Format */}
                  <div className="filter-group">
                    <label className="filter-label">Export Format</label>
                    <div className="button-group">
                      <button
                        onClick={() => setExportFormat('png')}
                        className={`button-group-item ${exportFormat === 'png' ? 'active' : ''}`}
                      >
                        PNG
                      </button>
                      <button
                        onClick={() => setExportFormat('jpg')}
                        className={`button-group-item ${exportFormat === 'jpg' ? 'active' : ''}`}
                      >
                        JPG
                      </button>
                      <button
                        onClick={() => setExportFormat('gif')}
                        className={`button-group-item ${exportFormat === 'gif' ? 'active' : ''}`}
                      >
                        GIF
                      </button>
                    </div>
                  </div>

                  {/* PNG Specific Options */}
                  {exportFormat === 'png' && (
                    <label className="checkbox-label-inline">
                      <input
                        type="checkbox"
                        checked={exportTransparent}
                        onChange={(e) => setExportTransparent(e.target.checked)}
                        className="checkbox-input"
                      />
                      Transparent Background
                    </label>
                  )}

                  {/* JPG Quality */}
                  {exportFormat === 'jpg' && (
                    <div className="filter-group">
                      <label className="filter-label">Quality: {(exportQuality * 100).toFixed(0)}%</label>
                      <input
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.1"
                        value={exportQuality}
                        onChange={(e) => setExportQuality(Number(e.target.value))}
                        className="range-input"
                      />
                    </div>
                  )}

                  {/* Export Button */}
                  <button
                    onClick={() => handleExport()}
                    className="button-primary"
                    style={{ width: '100%', marginTop: '1rem' }}
                  >
                    Export {exportFormat.toUpperCase()}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* No Match Selected */}
          {!currentMatchData && folderPath && (
            <div className="sidebar-placeholder">
              <p>{viewMode === 'single' ? 'Select a match to view heatmap' : 'Select a map to aggregate matches'}</p>
            </div>
          )}
        </aside>

        {/* Debug Panel */}
        {debugMode && (
          <div className="debug-panel">
            <div className="debug-header">
              <span>Debug Mode (Ctrl+Shift+D to toggle)</span>
              <button onClick={() => setDebugLogs([])}>Clear</button>
            </div>
            <div className="debug-logs">
              {debugLogs.map((log, i) => (
                <div key={i} className="debug-log">{log}</div>
              ))}
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="main-content">
          {aggregateLoadingProgress ? (
            <div className="loading-match-details">
              <div className="loading-spinner"></div>
              <div className="loading-text">
                Loading aggregate matches: {aggregateLoadingProgress.processed}/{aggregateLoadingProgress.total}
                ({aggregateLoadingProgress.percentage}%)
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${aggregateLoadingProgress.percentage}%` }}
                ></div>
              </div>
            </div>
          ) : loadingMatchDetails ? (
            <div className="loading-match-details">
              <div className="loading-spinner"></div>
              <div className="loading-text">Loading match details...</div>
            </div>
          ) : processingFilters ? (
            <div className="loading-match-details">
              <div className="loading-spinner"></div>
              <div className="loading-text">Processing filter data...</div>
              <div className="processing-note">
                Extracting players, weapons, and rounds from {aggregatedMatches.length} matches
              </div>
            </div>
          ) : currentMatchData ? (
            <div className="heatmap-wrapper">
              <Heatmap
                killEvents={filteredKillEvents}
                mapName={currentMatchData.map}
                bandwidth={bandwidth}
                opacity={opacity}
                showMode={showMode}
                styleMode={styleMode}
                playerMap={playerMap}
                showArrows={showArrows}
                showContext={showContext}
                colorLow={colorLow}
                colorHigh={colorHigh}
                colorKillsLow={colorKillsLow}
                colorKillsHigh={colorKillsHigh}
                colorDeathsLow={colorDeathsLow}
                colorDeathsHigh={colorDeathsHigh}
                colorKillerDot={colorKillerDot}
                colorVictimDot={colorVictimDot}
                independentKillsDeaths={independentKillsDeaths}
                overlayElements={overlayElements}
                onElementsChange={setOverlayElements}
                selectedTool={selectedTool}
                onSelectionChange={setSelectedElementId}
                selectedElementId={selectedElementId}
              />
            </div>
          ) : (
            <div className="empty-state">
              {!folderPath ? (
                <>
                  <div className="empty-icon"></div>
                  <h2>Select a Folder to Begin</h2>
                  <p>Choose a folder containing Valorant JSON match files</p>
                  <button onClick={handleSelectFolder} className="button-primary">
                    Choose Folder
                  </button>
                </>
              ) : (
                <>
                  <div className="empty-icon"></div>
                  <h2>Select a Match</h2>
                  <p>Choose a match from the sidebar to view heatmap</p>
                </>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default App