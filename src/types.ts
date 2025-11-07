// Type definitions matching Rust backend models

export interface Location {
  x: number;
  y: number;
}

export interface MatchSummary {
  match_id: string;
  map: string;
  region: string;
  game_start: string;
  teams: string[];
  score: string;
}

export interface PlayerStats {
  puuid: string;
  game_name: string;
  tag_line: string;
  agent: string | null;
  team: string;
  team_id: string;
  score: number;
  kills: number;
  deaths: number;
  assists: number;
  rounds_played: number;
  is_observer: boolean;
}

export interface KillEvent {
  killer_puuid: string;
  victim_puuid: string;
  weapon: string | null;
  killer_location: Location;
  victim_location: Location;
  round_num: number;
  round_time_millis: number;
}

export interface MatchDetail {
  match_id: string;
  map: string;
  region: string;
  game_start: string;
  game_length_millis: number;
  rounds_played: number;
  winning_team: string;
  players: PlayerStats[];
  kill_events: KillEvent[];
}

// Player map for tooltips
export interface PlayerInfo {
  name: string;
  agent: string;
  team: string;
}

