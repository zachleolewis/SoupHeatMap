use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

/// Location coordinates on the map
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Location {
    pub x: i32,
    pub y: i32,
}

/// Summary of a match for list views
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MatchSummary {
    pub match_id: String,
    pub map: String,
    pub region: String,
    pub game_start: DateTime<Utc>,
    pub teams: Vec<String>,
    pub score: String,
}

/// Player statistics in a match
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlayerStats {
    pub puuid: String,
    pub game_name: String,
    pub tag_line: String,
    pub agent: Option<String>,
    pub team: String,
    pub team_id: String,
    pub score: i32,
    pub kills: i32,
    pub deaths: i32,
    pub assists: i32,
    pub rounds_played: i32,
    #[serde(default)]
    pub is_observer: bool,
}

/// Kill event with positions for heatmap visualization
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KillEvent {
    pub killer_puuid: String,
    pub victim_puuid: String,
    pub weapon: Option<String>,
    pub killer_location: Location,
    pub victim_location: Location,
    pub round_num: i32,
    pub round_time_millis: i32,
}

/// Detailed match information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MatchDetail {
    pub match_id: String,
    pub map: String,
    pub region: String,
    pub game_start: DateTime<Utc>,
    pub game_length_millis: i64,
    pub rounds_played: i32,
    pub winning_team: String,
    pub players: Vec<PlayerStats>,
    pub kill_events: Vec<KillEvent>,
}

/// Raw JSON structures for parsing VCT files
#[derive(Debug, Deserialize)]
pub struct VctMatchData {
    #[serde(rename = "matchInfo")]
    pub match_info: MatchInfo,
    pub players: Vec<VctPlayer>,
    #[serde(rename = "roundResults")]
    pub round_results: Vec<RoundResult>,
}

#[derive(Debug, Deserialize)]
pub struct MatchInfo {
    #[serde(rename = "matchId")]
    pub match_id: String,
    pub map: String,
    #[serde(rename = "gameStartMillis")]
    pub game_start_millis: i64,
    #[serde(rename = "gameLengthMillis")]
    pub game_length_millis: i64,
}

#[derive(Debug, Deserialize)]
pub struct VctPlayer {
    pub puuid: String,
    #[serde(rename = "gameName")]
    pub game_name: String,
    #[serde(rename = "tagLine")]
    pub tag_line: String,
    #[serde(rename = "characterId")]
    pub character_id: Option<String>,
    #[serde(rename = "teamId")]
    pub team_id: String,
    pub stats: Option<VctStats>,
}

#[derive(Debug, Deserialize)]
pub struct VctStats {
    pub score: Option<i32>,
    pub kills: Option<i32>,
    pub deaths: Option<i32>,
    pub assists: Option<i32>,
    #[serde(rename = "roundsPlayed")]
    pub rounds_played: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct RoundResult {
    #[serde(rename = "roundNum")]
    pub round_num: i32,
    #[serde(rename = "winningTeam")]
    pub winning_team: Option<String>,
    #[serde(rename = "playerStats")]
    pub player_stats: Vec<PlayerRoundStats>,
}

#[derive(Debug, Deserialize)]
pub struct PlayerRoundStats {
    pub puuid: String,
    pub kills: Vec<Kill>,
}

#[derive(Debug, Deserialize)]
pub struct Kill {
    pub killer: String,
    pub victim: String,
    #[serde(rename = "finishingDamage")]
    pub finishing_damage: Option<FinishingDamage>,
    #[serde(rename = "killerLocation")]
    pub killer_location: Option<Location>,
    #[serde(rename = "victimLocation")]
    pub victim_location: Option<Location>,
    #[serde(rename = "timeSinceRoundStartMillis")]
    pub time_since_round_start_millis: i32,
    #[serde(rename = "playerLocations")]
    pub player_locations: Vec<PlayerLocation>,
}

#[derive(Debug, Deserialize)]
pub struct FinishingDamage {
    #[serde(rename = "damageItem")]
    pub damage_item: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct PlayerLocation {
    pub puuid: String,
    pub location: Location,
}
