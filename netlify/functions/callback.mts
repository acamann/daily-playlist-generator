import type { Context } from "@netlify/functions";

export default async (req: Request, context: Context) => {
  const query = new URL(req.url).searchParams;
  const code = query.get("code");
  const state = query.get("state");

  if (!state || !isValidState(state)) {
    return new Response("Invalid State", { status: 401 });
  }

  if (!code) {
    return new Response("Missing Authorization Code", { status: 401 });
  }

  const clientId = Netlify.env.get("SPOTIFY_CLIENT_ID");
  const clientSecret = Netlify.env.get("SPOTIFY_CLIENT_SECRET");

  const authResponse = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: "Basic " + (Buffer.from(clientId + ':' + clientSecret).toString('base64')),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      code: code,
      redirect_uri: "https://andy-spotify-generator.netlify.app/.netlify/functions/callback", // todo CONST this somewhere
      grant_type: 'authorization_code'
    }),
  });

  if (!authResponse.ok) {
    return new Response("Unable to get Spotify token: " + authResponse.body, { status: authResponse.status });
  }

  const { access_token } = await authResponse.json();
  console.log(await authResponse.json());
  console.log(access_token);

  return new Response(JSON.stringify({
    access_token,
  }),
  {
      headers: {
        'Cache-Control': 'max-age=86400, public',
        'Content-Type': 'application/json'
      }
  });
}

function isValidState(state: string) {
  return state === "Jw14cXrREPOse6U6";
}