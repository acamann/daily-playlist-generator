import type { Context } from "@netlify/functions";

export default async (req: Request, context: Context) => {
  const clientId = Netlify.env.get("SPOTIFY_CLIENT_ID");
  const clientSecret = Netlify.env.get("SPOTIFY_CLIENT_SECRET");

  const authResponse = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: "Basic " + (Buffer.from(clientId + ':' + clientSecret).toString('base64')),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "client_credentials"
    }),
  });

  if (!authResponse.ok) {
    return new Response("Unable to get Spotify token: " + authResponse.body, { status: authResponse.status });
  }

  const { access_token } = await authResponse.json();

  const response = await fetch("https://api.spotify.com/v1/me", {
    headers: {
      Authorization: "Bearer " + access_token
    }
  });

  return new Response(JSON.stringify(await response.json()));
}