import { getStore } from "@netlify/blobs";
import type { Context } from "@netlify/functions";

export default async (req: Request, context: Context) => {
  const clientId = Netlify.env.get("SPOTIFY_CLIENT_ID");

  const store = getStore("spotify-auth");
  const refreshToken = await store.get("refresh_token");

  if (!refreshToken || !clientId) {
    return new Response("Unable to Refresh Token", { status: 401 });
  }

  const url = "https://accounts.spotify.com/api/token";

  const payload = {
    method: 'POST',
    headers: {
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
  console.log(response);

  if (response.refresh_token) {
    await store.set("refresh_token", response.refresh_token);
  }

  const profile = await fetch("https://api.spotify.com/v1/me", {
    headers: {
      Authorization: "Bearer " + response.access_token
    }
  });

  return new Response(JSON.stringify(await profile.json()));
}