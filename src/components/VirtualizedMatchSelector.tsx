import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { MatchSummary } from '../types';

interface VirtualizedMatchSelectorProps {
  matches: MatchSummary[];
  selectedMatchId: string;
  onMatchSelect: (matchId: string) => void;
  disabled: boolean;
  loading: boolean;
  loadingMatchDetails?: boolean;
}

const ITEM_HEIGHT = 32;
const VISIBLE_ITEMS = 8;
const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

export const VirtualizedMatchSelector: React.FC<VirtualizedMatchSelectorProps> = ({
  matches,
  selectedMatchId,
  onMatchSelect,
  disabled,
  loading,
  loadingMatchDetails = false
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter matches based on search term
  const filteredMatches = useMemo(() => {
    if (!searchTerm.trim()) return matches;
    const term = searchTerm.toLowerCase();
    return matches.filter(match =>
      match.map.toLowerCase().includes(term) ||
      match.score.toLowerCase().includes(term) ||
      match.match_id.toLowerCase().includes(term)
    );
  }, [matches, searchTerm]);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / ITEM_HEIGHT);
    const end = Math.min(start + VISIBLE_ITEMS + 2, filteredMatches.length); // +2 for buffer
    return { start: Math.max(0, start), end };
  }, [scrollTop, filteredMatches.length]);

  // Get visible items
  const visibleItems = useMemo(() => {
    return filteredMatches.slice(visibleRange.start, visibleRange.end);
  }, [filteredMatches, visibleRange]);

  // Calculate total height for scrollbar
  const totalHeight = filteredMatches.length * ITEM_HEIGHT;

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Handle item click
  const handleItemClick = useCallback((matchId: string) => {
    if (!disabled) {
      onMatchSelect(matchId);
      // Clear search when selecting
      setSearchTerm('');
    }
  }, [disabled, onMatchSelect]);

  // Handle search input
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setScrollTop(0); // Reset scroll when searching
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const currentIndex = filteredMatches.findIndex(m => m.match_id === selectedMatchId);
      if (currentIndex === -1) return;

      let newIndex;
      if (e.key === 'ArrowDown') {
        newIndex = Math.min(currentIndex + 1, filteredMatches.length - 1);
      } else {
        newIndex = Math.max(currentIndex - 1, 0);
      }

      if (newIndex !== currentIndex) {
        const newMatch = filteredMatches[newIndex];
        onMatchSelect(newMatch.match_id);

        // Auto-scroll to keep selected item visible
        const itemTop = newIndex * ITEM_HEIGHT;
        const itemBottom = itemTop + ITEM_HEIGHT;
        const containerTop = scrollTop;
        const containerBottom = scrollTop + CONTAINER_HEIGHT;

        if (itemTop < containerTop) {
          setScrollTop(itemTop);
        } else if (itemBottom > containerBottom) {
          setScrollTop(itemBottom - CONTAINER_HEIGHT);
        }
      }
    } else if (e.key === 'Enter' && selectedMatchId) {
      // Clear search on enter
      setSearchTerm('');
    }
  }, [filteredMatches, selectedMatchId, onMatchSelect, scrollTop]);

  // Reset scroll when matches change
  useEffect(() => {
    setScrollTop(0);
  }, [filteredMatches.length]);

  // Focus search input when component mounts
  useEffect(() => {
    if (searchInputRef.current && !disabled && !loading) {
      searchInputRef.current.focus();
    }
  }, [disabled, loading]);

  if (loading) {
    return (
      <div className="virtualized-selector" style={{ height: CONTAINER_HEIGHT + 40 }}>
        <div className="selector-header">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Loading matches..."
            className="search-input"
            disabled
          />
        </div>
        <div className="loading-indicator">
          Loading matches...
        </div>
      </div>
    );
  }

  return (
    <div className="virtualized-selector" style={{ height: CONTAINER_HEIGHT + 40 }}>
      <div className="selector-header">
        <input
          ref={searchInputRef}
          type="text"
          placeholder={filteredMatches.length === 0 ? "No matches loaded" : loadingMatchDetails ? "Loading match details..." : "Search matches..."}
          value={searchTerm}
          onChange={handleSearchChange}
          onKeyDown={handleKeyDown}
          className="search-input"
          disabled={disabled || loadingMatchDetails}
        />
        {filteredMatches.length !== matches.length && (
          <div className="search-results">
            {filteredMatches.length} of {matches.length} matches
          </div>
        )}
      </div>

      <div
        ref={containerRef}
        className="virtualized-list"
        style={{ height: CONTAINER_HEIGHT }}
        onScroll={handleScroll}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          {visibleItems.map((match, index) => {
            const actualIndex = visibleRange.start + index;
            const isSelected = match.match_id === selectedMatchId;

            return (
              <div
                key={match.match_id}
                className={`virtualized-item ${isSelected ? 'selected' : ''}`}
                style={{
                  position: 'absolute',
                  top: actualIndex * ITEM_HEIGHT,
                  height: ITEM_HEIGHT,
                  width: '100%'
                }}
                onClick={() => handleItemClick(match.match_id)}
              >
                <div className="match-info">
                  <span className="match-map">{match.map}</span>
                  <span className="match-score">{match.score}</span>
                  <span className="match-region">{match.region}</span>
                </div>
                <div className="match-date">
                  {new Date(match.game_start).toLocaleDateString()} {new Date(match.game_start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
