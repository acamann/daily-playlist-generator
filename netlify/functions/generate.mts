import { getStore } from "@netlify/blobs";
import type { Context } from "@netlify/functions";

export default async (req: Request, context: Context) => {
  const accessToken = await refreshToken();

  if (!accessToken) {
    return new Response("Unable to Refresh Token", { status: 401 });
  }

  // get most recent spurgeon daily reading
  const spurgeonPodcastId = "3K7ozH48m7PKoRTkJ4Cdc0";
  const spurgeon = await fetch(`https://api.spotify.com/v1/shows/${spurgeonPodcastId}/episodes?limit=1`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  const body = await spurgeon.json();
  const suprgeonTodayId = body.items[0].id;

  // DO More:
  // get public playlist by id
  // either get latest track (podcast episode from today), or random track
  
  // modify playlist by ID to remove existing & add the above songs
  const morningPlaylistId = "2izrV7kDCebemseu3qeo3x";
  const updateMorningPlaylistResponse = await fetch(`https://api.spotify.com/v1/playlists/${morningPlaylistId}/tracks`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      uris: [
        `spotify:episode:${suprgeonTodayId}`
      ]
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