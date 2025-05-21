type PlaylistConfig = {
    id: string;
    name: string;
    creation_date: string;
    tracks: TrackConfig[];
}

type TrackConfig = {
    source_type: 
        "album_iterative_track" |
        "playlist_random_track" |
        "podcast_latest_episode" |
        "playlist_iterative_track" |
        "podcast_latest_unplayed" |
        "podcast_todays_episode";
    source_id: string;
    day_of_week?: 1 | 2 | 3 | 4 | 5;
}