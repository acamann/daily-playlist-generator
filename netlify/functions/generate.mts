import { getStore } from "@netlify/blobs";
import type { Context } from "@netlify/functions";

const SPURGEON_PODCAST_ID = "3K7ozH48m7PKoRTkJ4Cdc0";
const WILDER_WOODS_MIX_PLAYLIST_ID = "37i9dQZF1EIWwhSWwHF4t0";

const DAILY_COMMUTE_MORNING_PLAYLIST_ID = "2izrV7kDCebemseu3qeo3x";

export default async (req: Request, context: Context) => {
  const accessToken = await refreshToken();

  if (!accessToken) {
    return new Response("Unable to Refresh Token", { status: 401 });
  }

  // construct playlist
  const playlistUris: string[] = [];
  playlistUris.push(await getLatestPodcastEpisodeId(SPURGEON_PODCAST_ID, accessToken));
  playlistUris.push(await getRandomPlaylistTrackId(WILDER_WOODS_MIX_PLAYLIST_ID, accessToken));
  
  // modify playlist by ID to replace with the above playlist
  const updateMorningPlaylistResponse = await fetch(`https://api.spotify.com/v1/playlists/${DAILY_COMMUTE_MORNING_PLAYLIST_ID}/tracks`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      uris: playlistUris
    })
  });

  return updateMorningPlaylistResponse;
}

async function refreshToken(): Promise<string | null> {  
  const clientId = Netlify.env.get("SPOTIFY_CLIENT_ID");
  const clientSecret = Netlify.env.get("SPOTIFY_CLIENT_SECRET");

  const store = getStore("spotify-auth");
  const refreshToken = await store.get("refresh_token");

  if (!refreshToken || !clientId) {
    return null;
  }

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

  if (response.refresh_token) {
    await store.set("refresh_token", response.refresh_token);
  }

  return response.access_token;
}

async function getLatestPodcastEpisodeId(podcastId: string, accessToken: string): Promise<string> {
  const episodesResponse = await fetch(`https://api.spotify.com/v1/shows/${podcastId}/episodes?limit=1`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  const episodesBody = await episodesResponse.json();
  const latestEpisodeId = episodesBody.items[0].id;
  return latestEpisodeId;
}

async function getRandomPlaylistTrackId(playlistId: string, accessToken: string): Promise<string> {
  const playlistTracksResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  const tracksBody = await playlistTracksResponse.json();
  console.log(tracksBody);
  const randomIndex = Math.floor(Math.random() * tracksBody.total)
  const randomTrackId = tracksBody.items[randomIndex].id;
  return randomTrackId;
}