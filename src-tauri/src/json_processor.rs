use crate::models::*;
use chrono::{Utc, TimeZone};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

/// Weapon UUID to name mapping (from reference code)
fn get_weapon_map() -> HashMap<&'static str, &'static str> {
    let mut map = HashMap::new();
    
    // Assault Rifles
    map.insert("E336C6B8-418D-9340-D77F-7A9E4CFE0702", "Vandal");
    map.insert("9C82E19D-4575-0200-1A81-3EACF00CF872", "Vandal");
    map.insert("1BAA85B4-4C70-1284-64BB-6481DFC3BB4E", "Vandal");
    map.insert("EE8E8D15-496B-07AC-E5F6-8FAE5D4C7B1A", "Phantom");
    map.insert("AE3DE142-4D85-2547-DD26-4E90BED35CF7", "Phantom");
    map.insert("C4883E50-4494-202C-3EC3-6B8A9284F00B", "Bulldog");
    map.insert("AE3DE142-4D85-2547-DD26-4E90BED35A7B", "Guardian");
    
    // Snipers
    map.insert("A03B24D3-4319-996D-0F8C-94BBFBA1DFC7", "Operator");
    map.insert("4ECE3B7E-4BC3-8EB9-E9AD-6DB6EF4D3F9C", "Operator");
    map.insert("C14908BC-4EF5-ACB9-7B8E-421BD7B8CB6C", "Marshal");
    
    // SMGs
    map.insert("F7E1B454-4AD4-1063-EC0A-159E56B58941", "Stinger");
    map.insert("462080D1-4035-2937-7C09-27AA2A5C27A7", "Spectre");
    
    // Shotguns
    map.insert("910BE174-449B-C412-AB22-D0873436B21B", "Bucky");
    map.insert("EC845BF4-4F79-DDDA-A3DA-0DB3774B2794", "Judge");
    
    // LMGs
    map.insert("63E6C2B6-4A8E-869C-3D4C-E38355226584", "Ares");
    map.insert("4EBC1E9F-4EE7-2E0F-F6A6-4E56F38044C2", "Odin");
    
    // Pistols
    map.insert("29A0CFAB-485B-F5D5-779A-B59F85E204A8", "Classic");
    map.insert("42DA8CCC-40D5-AFFC-BEEC-15AA47B42EDA", "Shorty");
    map.insert("44D4E95C-4157-0037-81B2-17841BF2E8E3", "Frenzy");
    map.insert("E370FA57-4757-3604-3648-499A3F21CC59", "Sheriff");
    
    // Melee & Abilities
    map.insert("2F59173C-4BED-B6C3-2191-DEA9B58E9CF7", "Knife");
    map.insert("5F0AAF7A-4289-3998-D5FF-EB9A5CF7EF5C", "Melee");
    map.insert("4ADE7FAA-4CF1-8376-95EF-39884480959B", "Ability");
    
    map
}

/// Extract region from file path
fn extract_region_from_path(path: &Path) -> String {
    let path_str = path.to_string_lossy();
    
    if path_str.contains("AMERICAS") {
        "AMERICAS".to_string()
    } else if path_str.contains("EMEA") {
        "EMEA".to_string()
    } else if path_str.contains("PACIFIC") {
        "PACIFIC".to_string()
    } else if path_str.contains("CHINA") {
        "CHINA".to_string()
    } else {
        "UNKNOWN".to_string()
    }
}

/// Extract kill events from round results
fn extract_kill_events(round_results: &[RoundResult]) -> Vec<KillEvent> {
    let weapon_map = get_weapon_map();
    let mut kill_events = Vec::new();
    
    for round_data in round_results {
        let round_num = round_data.round_num;
        
        for player_stat in &round_data.player_stats {
            for kill in &player_stat.kills {
                // Extract weapon name from UUID
                let weapon_name = kill.finishing_damage
                    .as_ref()
                    .and_then(|fd| fd.damage_item.as_ref())
                    .and_then(|uuid| weapon_map.get(uuid.as_str()))
                    .map(|&name| name.to_string());
                
                // Skip if victim location is missing
                let victim_loc = match &kill.victim_location {
                    Some(loc) => loc.clone(),
                    None => continue,
                };
                
                // Find killer location from playerLocations
                let killer_loc = kill.player_locations
                    .iter()
                    .find(|pl| pl.puuid == kill.killer)
                    .map(|pl| pl.location.clone())
                    .unwrap_or(Location { x: 0, y: 0 });
                
                kill_events.push(KillEvent {
                    killer_puuid: kill.killer.clone(),
                    victim_puuid: kill.victim.clone(),
                    weapon: weapon_name,
                    killer_location: killer_loc,
                    victim_location: victim_loc,
                    round_num,
                    round_time_millis: kill.time_since_round_start_millis,
                });
            }
        }
    }
    
    kill_events
}

/// Parse match JSON file into MatchSummary
pub fn parse_match_summary(path: &Path, data: &VctMatchData) -> MatchSummary {
    let region = extract_region_from_path(path);
    
    // Extract unique teams
    let mut teams = Vec::new();
    let mut seen_teams = std::collections::HashSet::new();
    for player in &data.players {
        if (player.team_id == "Blue" || player.team_id == "Red") && !seen_teams.contains(&player.team_id) {
            teams.push(player.team_id.clone());
            seen_teams.insert(player.team_id.clone());
        }
    }
    
    // Calculate score from round results
    let mut team_wins: HashMap<String, i32> = HashMap::new();
    team_wins.insert("Blue".to_string(), 0);
    team_wins.insert("Red".to_string(), 0);
    
    for round_result in &data.round_results {
        if let Some(winning_team) = &round_result.winning_team {
            *team_wins.entry(winning_team.clone()).or_insert(0) += 1;
        }
    }
    
    let score = format!(
        "{}-{}",
        team_wins.get("Blue").unwrap_or(&0),
        team_wins.get("Red").unwrap_or(&0)
    );
    
    let game_start = Utc.timestamp_millis_opt(data.match_info.game_start_millis)
        .single()
        .unwrap_or_else(|| Utc::now());
    
    MatchSummary {
        match_id: data.match_info.match_id.clone(),
        map: data.match_info.map.clone(),
        region,
        game_start,
        teams,
        score,
    }
}

/// Parse match JSON file into MatchDetail
pub fn parse_match_detail(path: &Path, data: &VctMatchData) -> MatchDetail {
    let region = extract_region_from_path(path);
    
    // Parse players
    let players: Vec<PlayerStats> = data.players
        .iter()
        .map(|player| {
            let stats = player.stats.as_ref();
            let team_id = player.team_id.clone();
            
            PlayerStats {
                puuid: player.puuid.clone(),
                game_name: player.game_name.clone(),
                tag_line: player.tag_line.clone(),
                agent: player.character_id.clone(),
                team: team_id.clone(),
                team_id: team_id.clone(),
                score: stats.and_then(|s| s.score).unwrap_or(0),
                kills: stats.and_then(|s| s.kills).unwrap_or(0),
                deaths: stats.and_then(|s| s.deaths).unwrap_or(0),
                assists: stats.and_then(|s| s.assists).unwrap_or(0),
                rounds_played: stats.and_then(|s| s.rounds_played).unwrap_or(0),
                is_observer: team_id != "Blue" && team_id != "Red",
            }
        })
        .collect();
    
    // Extract kill events
    let kill_events = extract_kill_events(&data.round_results);
    
    let game_start = Utc.timestamp_millis_opt(data.match_info.game_start_millis)
        .single()
        .unwrap_or_else(|| Utc::now());
    
    MatchDetail {
        match_id: data.match_info.match_id.clone(),
        map: data.match_info.map.clone(),
        region,
        game_start,
        game_length_millis: data.match_info.game_length_millis,
        rounds_played: data.round_results.len() as i32,
        winning_team: "Unknown".to_string(), // Could calculate from round results
        players,
        kill_events,
    }
}

/// Load all JSON files from a directory with progress tracking
pub fn load_json_files_with_progress(folder_path: &str, progress_callback: impl Fn(usize, usize)) -> Result<Vec<MatchSummary>, String> {
    let path = Path::new(folder_path);

    if !path.exists() {
        return Err(format!("Folder does not exist: {}", folder_path));
    }

    let mut all_files = Vec::new();

    // Collect all JSON file paths first
    for entry in WalkDir::new(path)
        .follow_links(true)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let path = entry.path();

        if path.extension().and_then(|s| s.to_str()) == Some("json") {
            all_files.push(path.to_path_buf());
        }
    }

    let total_files = all_files.len();
    let mut matches = Vec::new();
    let mut processed = 0;

    // Process all files with progress updates
    for file_path in &all_files {
        match fs::read_to_string(file_path) {
            Ok(content) => {
                match serde_json::from_str::<VctMatchData>(&content) {
                    Ok(data) => {
                        let summary = parse_match_summary(file_path, &data);
                        matches.push(summary);
                    }
                    Err(e) => {
                        eprintln!("Error parsing {}: {}", file_path.display(), e);
                        // Continue processing other files even if one fails
                    }
                }
            }
            Err(e) => {
                eprintln!("Error reading {}: {}", file_path.display(), e);
                // Continue processing other files even if one fails
            }
        }

        processed += 1;

        // Report progress every 10 files or at key milestones
        if processed % 10 == 0 || processed == total_files || processed == 1 {
            progress_callback(processed, total_files);
        }
    }

    Ok(matches)
}

/// Index of match IDs to file paths for fast lookup
static mut MATCH_INDEX: Option<HashMap<String, PathBuf>> = None;

/// Load all JSON files from a directory and build index
pub fn load_json_files(folder_path: &str) -> Result<Vec<MatchSummary>, String> {
    let matches = load_json_files_with_progress(folder_path, |_, _| {})?;

    // Build index for fast lookups
    let mut index = HashMap::new();
    let path = Path::new(folder_path);

    for entry in WalkDir::new(path)
        .follow_links(true)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let file_path = entry.path();

        if file_path.extension().and_then(|s| s.to_str()) == Some("json") {
            if let Ok(content) = fs::read_to_string(file_path) {
                if let Ok(data) = serde_json::from_str::<VctMatchData>(&content) {
                    index.insert(data.match_info.match_id.clone(), file_path.to_path_buf());
                }
            }
        }
    }

    // Store index globally for fast lookups
    unsafe {
        MATCH_INDEX = Some(index);
    }

    Ok(matches)
}

/// Get match detail by ID using index for fast lookup
pub fn get_match_by_id(folder_path: &str, match_id: &str) -> Result<MatchDetail, String> {
    // First try to use the index for fast lookup
    unsafe {
        if let Some(ref index) = MATCH_INDEX {
            if let Some(file_path) = index.get(match_id) {
                if let Ok(content) = fs::read_to_string(file_path) {
                    if let Ok(data) = serde_json::from_str::<VctMatchData>(&content) {
                        return Ok(parse_match_detail(file_path, &data));
                    }
                }
            }
        }
    }

    // Fallback to scanning if index lookup fails (shouldn't happen in normal operation)
    let path = Path::new(folder_path);

    if !path.exists() {
        return Err(format!("Folder does not exist: {}", folder_path));
    }

    // Walk directory tree to find matching file
    for entry in WalkDir::new(path)
        .follow_links(true)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let file_path = entry.path();

        if file_path.extension().and_then(|s| s.to_str()) == Some("json") {
            if let Ok(content) = fs::read_to_string(file_path) {
                if let Ok(data) = serde_json::from_str::<VctMatchData>(&content) {
                    if data.match_info.match_id == match_id {
                        return Ok(parse_match_detail(file_path, &data));
                    }
                }
            }
        }
    }

    Err(format!("Match not found with ID: {}", match_id))
}

/// Load multiple match details in controlled batches to prevent system overload
pub fn get_multiple_match_details_batched(
    folder_path: &str,
    match_ids: &[String],
    batch_size: usize,
    progress_callback: impl Fn(usize, usize)
) -> Result<Vec<MatchDetail>, String> {
    let mut results = Vec::with_capacity(match_ids.len());
    let total_matches = match_ids.len();

    // Process in controlled batches to prevent system overload
    for (batch_start, batch) in match_ids.chunks(batch_size).enumerate() {
        let batch_index = batch_start * batch_size;

        // Process batch in parallel
        let handles: Vec<_> = batch.iter().enumerate().map(|(i, match_id)| {
            let match_id = match_id.clone();
            let folder_path = folder_path.to_string();
            let global_index = batch_index + i;

            std::thread::spawn(move || {
                let result = get_match_by_id(&folder_path, &match_id);
                (global_index, result)
            })
        }).collect();

        // Collect results from this batch
        let mut batch_results = vec![None; batch.len()];
        for handle in handles {
            match handle.join() {
                Ok((index, result)) => {
                    let batch_index = index - batch_start * batch_size;
                    batch_results[batch_index] = Some(result);
                },
                Err(_) => return Err("Thread panicked while loading match details".to_string()),
            }
        }

        // Process batch results
        for result in batch_results {
            match result {
                Some(Ok(detail)) => {
                    results.push(detail);
                    // Report progress after each successful load
                    progress_callback(results.len(), total_matches);
                },
                Some(Err(e)) => return Err(format!("Failed to load match detail: {}", e)),
                None => return Err("Missing result from batch processing".to_string()),
            }
        }

        // Small delay between batches to prevent overwhelming the system
        std::thread::sleep(std::time::Duration::from_millis(10));
    }

    Ok(results)
}

/// Load multiple match details in parallel for better performance (with default batching)
pub fn get_multiple_match_details(folder_path: &str, match_ids: &[String]) -> Result<Vec<MatchDetail>, String> {
    // Use batch size of 10 to balance speed vs system load
    // Progress callback does nothing by default
    get_multiple_match_details_batched(folder_path, match_ids, 10, |_, _| {})
}
