import type { Context } from "@netlify/functions";

export default async (req: Request, context: Context) => {
  const clientId = Netlify.env.get("SPOTIFY_CLIENT_ID");
  const clientSecret = Netlify.env.get("SPOTIFY_CLIENT_SECRET");

  // TODO: do stuff

  // const response = await fetch("https://api.spotify.com/v1/me", {
  //   headers: {
  //     Authorization: "Bearer " + access_token
  //   }
  // });

  return new Response(); //(JSON.stringify(await response.json()));
}