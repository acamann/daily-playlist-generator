export type GetAlbumTracksResponse = {
  total: number;
  items: { uri: string }[];
}
  
export type GetPlaylistTracksResponse = {
  total: number;
  items: { track: { uri: string } }[];
}

export type GetEpisodesResponse = {
  items: Episode[];
}

type Episode = {
  uri: string;
  resume_point: {
    fully_played: boolean;
    resume_position_ms: number
  }
}

export type GetTokenResponse = {
  access_token: string | undefined;
  refresh_token: string | undefined;
}