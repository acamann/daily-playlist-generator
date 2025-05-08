import type { Context } from "@netlify/functions";

export default async (req: Request, context: Context) => {
  const clientId = Netlify.env.get("SPOTIFY_CLIENT_ID");

  if (!clientId) {
    return new Response("No Client Id");
  }

  const queryParams = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: "user-read-private user-read-email",
    redirect_uri: "https://andy-spotify-generator.netlify.app/.netlify/functions/callback",
    state: generateState()
  });
  return Response.redirect("https://accounts.spotify.com/authorize?" + queryParams.toString(), 302);
}

// TODO: make state generation & checking more secure while still deterministic
function generateState() {
  return "Jw14cXrREPOse6U6"
}