type PlaylistConfig = {
    playlist_id: string;
    creation_date: string;
    tracks: TrackConfig[];
}

type TrackConfig = {
    mode: "iterative" | "random" | "latest";
    source_type: "album" | "playlist" | "podcast";
    source_id: string;
}