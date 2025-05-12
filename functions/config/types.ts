type PlaylistConfig = {
    id: string;
    name: string;
    creation_date: string;
    tracks: TrackConfig[];
}

type TrackConfig = {
    source_type: "album_iterative_track" | "playlist_random_track" | "podcast_latest_episode" | "playlist_iterative_track";
    source_id: string;
}