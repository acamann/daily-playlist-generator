import type { Context } from "@netlify/functions";
import { randomBytes } from "node:crypto";
import { getStore } from "@netlify/blobs";

export default async (req: Request, context: Context) => {
  const clientId = Netlify.env.get("SPOTIFY_CLIENT_ID");

  if (!clientId) {
    return new Response("No Client Id");
  }

  const state = generateState();
  const store = getStore("spotify-auth");
  await store.set("state", state);

  const queryParams = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: "user-read-private user-read-email",
    redirect_uri: "https://andy-spotify-generator.netlify.app/.netlify/functions/callback",
    state
  });
  return Response.redirect("https://accounts.spotify.com/authorize?" + queryParams.toString(), 302);
}

function generateState() {
  return randomBytes(32).toString('hex');
}