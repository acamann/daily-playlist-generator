import { isToday } from "./date.mjs";
import { GetAlbumTracksResponse, GetEpisodesResponse, GetPlaylistTracksResponse, GetTokenResponse } from "./types";

export async function spotifyGetRequest<TResponse>(url: string, accessToken: string): Promise<TResponse> {
  const getResponse = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  const bodyJson = await getResponse.json() as Promise<TResponse>;
  // TODO: type checking
  return bodyJson;
}

export async function getLatestPodcastEpisodeUri(podcastId: string, accessToken: string): Promise<string> {
  const episodes = await spotifyGetRequest<GetEpisodesResponse>(`https://api.spotify.com/v1/shows/${podcastId}/episodes?limit=1`, accessToken);
  const episodeUri = episodes.items[0].uri;
  console.log(`Fetching Podcast ${podcastId} :: Latest :: Episode URI ${episodeUri}`);
  return episodeUri;
}

export async function getLatestUnplayedPodcastEpisodeUri(podcastId: string, accessToken: string, limit = 10): Promise<string | null> {
  const episodes = await spotifyGetRequest<GetEpisodesResponse>(`https://api.spotify.com/v1/shows/${podcastId}/episodes?limit=${limit}`, accessToken);
  for (let i = 0; i < episodes.items.length; i++) {
    if (!episodes.items[i].resume_point.fully_played && episodes.items[i].resume_point.resume_position_ms === 0) {
      const episodeUri = episodes.items[i].uri;
      console.log(`Fetching Podcast ${podcastId} :: Latest Unplayed :: Limit ${limit} :: Episode URI ${episodeUri}`);
      return episodeUri;
    }
  }
  console.log(`Fetching Podcast ${podcastId} :: Latest Unplayed :: Limit ${limit} :: All of the latest ${limit} episodes have been played`);
  return null;
}

export async function getTodaysPodcastEpisodeUri(podcastId: string, accessToken: string): Promise<string | null> {
  const episodes = await spotifyGetRequest<GetEpisodesResponse>(`https://api.spotify.com/v1/shows/${podcastId}/episodes?limit=1`, accessToken);
  if (isToday(episodes.items[0].release_date)) {
    const episodeUri = episodes.items[0].uri;
    console.log(`Fetching Podcast ${podcastId} :: Today's Episode :: Episode URI ${episodeUri}`);
    return episodeUri;
  }
  console.log(`Fetching Podcast ${podcastId} :: Today's Episode :: No episode today. Latest Episode Date ${episodes.items[0].release_date}`);
  return null;
}

export async function getRandomPlaylistTrackUri(playlistId: string, accessToken: string): Promise<string> {
  const trackCount = await spotifyGetRequest<GetPlaylistTracksResponse>(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=1&fields=total`, accessToken);
  const randomIndex = Math.floor(Math.random() * trackCount.total);
  const tracks = await spotifyGetRequest<GetPlaylistTracksResponse>(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=1&offset=${randomIndex}&fields=items(track(uri))`, accessToken);
  const trackUri = tracks.items[0].track.uri;
  console.log(`Fetching Playlist ${playlistId} :: Playlist Length ${trackCount.total} :: Random :: Track Index ${randomIndex} :: Track URI ${trackUri}`);
  return trackUri;
}

export async function getIterativePlaylistTrackUri(playlistId: string, iteration: number, accessToken: string): Promise<string> {
  const trackCount = await spotifyGetRequest<GetPlaylistTracksResponse>(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=1&fields=total`, accessToken);
  const iterativeIndex = iteration % trackCount.total;
  const tracks = await spotifyGetRequest<GetPlaylistTracksResponse>(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=1&offset=${iterativeIndex}&fields=items(track(uri))`, accessToken);
  const trackUri = tracks.items[0].track.uri;
  console.log(`Fetching Playlist ${playlistId} :: Playlist Length ${trackCount.total} :: Iteration ${iteration} :: Track Index ${iterativeIndex} :: Track URI ${trackUri}`);
  return trackUri;
}

export async function getIterativeAlbumTrackUri(albumId: string, iteration: number, accessToken: string): Promise<string> {
  let tracks = await spotifyGetRequest<GetAlbumTracksResponse>(`https://api.spotify.com/v1/albums/${albumId}/tracks?limit=50`, accessToken);
  const totalTracks = tracks.total;
  const tracksLength = tracks.items.length;
  const iterativeIndex = iteration % totalTracks;
  let itemIndex = iterativeIndex;
  if (iterativeIndex >= tracksLength) {
    // the current iteration is beyond the first page, need to get it individually
    console.log("Need to fetch album tracks at offset");
    tracks = await spotifyGetRequest<GetAlbumTracksResponse>(`https://api.spotify.com/v1/albums/${albumId}/tracks?limit=1&offset=${iterativeIndex}`, accessToken);
    itemIndex = 0;
  }
  const trackUri = tracks.items[itemIndex].uri;
  console.log(`Fetching Album ${albumId} :: Album Length ${totalTracks} :: Iteration ${iteration} :: Track Index ${iterativeIndex} :: Track URI ${trackUri}`);
  return trackUri;
}

export async function getAccessToken(clientId: string, clientSecret: string, refreshToken: string): Promise<GetTokenResponse> {
  const url = "https://accounts.spotify.com/api/token";

  const payload = {
    method: 'POST',
    headers: {
      Authorization: "Basic " + (Buffer.from(clientId + ':' + clientSecret).toString('base64')),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId
    }),
  }
  
  const body = await fetch(url, payload);
  const response = await body.json();

  return response;
}