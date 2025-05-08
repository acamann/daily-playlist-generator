import { getStore } from "@netlify/blobs";
import type { Context } from "@netlify/functions";

export default async (req: Request, context: Context) => {
  const accessToken = await refreshToken();

  if (!accessToken) {
    return new Response("Unable to Refresh Token", { status: 401 });
  }

  // get public playlist by id
  // either get latest track (podcast episode from today), or random track
  
  // modify playlist by ID to remove existing & add the above songs

  const profile = await fetch("https://api.spotify.com/v1/me", {
    headers: {
      Authorization: "Bearer " + accessToken
    }
  });

  return new Response(JSON.stringify(await profile.json()));
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