import { getStore } from "@netlify/blobs";
import type { Context } from "@netlify/functions";
import { getLogs } from "./utils/logging.mjs";
import { getAccessToken, getIterativeAlbumTrackUri, getLatestPodcastEpisodeUri, getRandomPlaylistTrackUri } from "./utils/spotify.mjs";

const SPURGEON_PODCAST_ID = "3K7ozH48m7PKoRTkJ4Cdc0";
const INSTRUMENTAL_PLAYLIST_ID = "5mgpMDPflYQRXU7XgYsRMe";
const SYNESTHESIA_ALBUM_ID = "4D7S7xyJToJ28MVcSH3YFo";
const DAILY_STRENGTH_PODCAST_ID = "3xcd7ws8kprhSCVBDTKb3W";

const DAILY_COMMUTE_MORNING_PLAYLIST_ID = "2izrV7kDCebemseu3qeo3x";

const ONE_DAY = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
const NOW = new Date();
const TODAY = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate()).getTime();
const PLAYLIST_BIRTHDAY = new Date(2025, 4, 8).getTime(); // 5/8/25

const PLAYLIST_ITERATION = Math.round(Math.abs((TODAY - PLAYLIST_BIRTHDAY) / ONE_DAY));

export default async (req: Request, context: Context) => {
  const accessToken = await getToken();

  if (!accessToken) {
    return new Response("Unable to Refresh Access Token", { status: 401 });
  }

  // construct playlist
  const playlistUris: string[] = [];
  playlistUris.push(await getIterativeAlbumTrackUri(SYNESTHESIA_ALBUM_ID, PLAYLIST_ITERATION, accessToken));
  playlistUris.push(await getLatestPodcastEpisodeUri(SPURGEON_PODCAST_ID, accessToken));
  playlistUris.push(await getRandomPlaylistTrackUri(INSTRUMENTAL_PLAYLIST_ID, accessToken));
  playlistUris.push(await getLatestPodcastEpisodeUri(DAILY_STRENGTH_PODCAST_ID, accessToken));
  playlistUris.push(await getRandomPlaylistTrackUri(INSTRUMENTAL_PLAYLIST_ID, accessToken));
  
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
  console.log(`Update Morning Playlist Response: ${updateMorningPlaylistResponse.status}`);
  return new Response(JSON.stringify(getLogs()));
}

async function getToken(): Promise<string | undefined> {
  const clientId = Netlify.env.get("SPOTIFY_CLIENT_ID");
  const clientSecret = Netlify.env.get("SPOTIFY_CLIENT_SECRET");

  const store = getStore("spotify-auth");
  const refreshToken = await store.get("refresh_token");

  if (!clientId || !clientSecret || !refreshToken) {
    return undefined;
  }

  console.log("Refreshing Token");
  const {
    access_token: accessToken,
    refresh_token: newRefreshToken
  } = await getAccessToken(clientId, clientSecret, refreshToken);
  
  if (newRefreshToken) {
    // This is not included in every token response.  Perhaps never.  Perhaps only near expiration?
    await store.set("refresh_token", newRefreshToken);
    console.log("New refresh token stored");
  }

  return accessToken;
}