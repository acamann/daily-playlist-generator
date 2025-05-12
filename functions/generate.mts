import { getStore } from "@netlify/blobs";
import type { Context } from "@netlify/functions";
import { setupLogging } from "./utils/logging.mjs";
import { getAccessToken, getIterativeAlbumTrackUri, getLatestPodcastEpisodeUri, getRandomPlaylistTrackUri } from "./utils/spotify.mjs";
import { getDaysSince } from "./utils/date.mjs";
import { readFileSync } from "fs";

const morningConfigPath = require.resolve("./config/morning.json");
const morningConfigJson = readFileSync(morningConfigPath, "utf-8");
const morningPlaylist = JSON.parse(morningConfigJson) as PlaylistConfig;

export default async (req: Request, context: Context) => {
  const getLogs = setupLogging();
  
  const accessToken = await getToken();
  if (!accessToken) {
    return new Response("Unable to Refresh Access Token", { status: 401 });
  }

  const iteration = getDaysSince(new Date(morningPlaylist.creation_date));
  console.log(`Generating Playlist ${morningPlaylist.name} :: Daily Iteration ${iteration}`);

  const playlistUris: string[] = [];
  for (let i = 0; i < morningPlaylist.tracks.length; i++) {
    playlistUris.push(await getTrackUri(morningPlaylist.tracks[i], accessToken, iteration));
  }
  
  // modify playlist by ID to replace with the above playlist
  console.log(`Updating Playlist ${morningPlaylist.name} :: Id ${morningPlaylist.id}`);
  const updateMorningPlaylistResponse = await fetch(`https://api.spotify.com/v1/playlists/${morningPlaylist.id}/tracks`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      uris: playlistUris
    })
  });
  console.log(`Update Playlist Response: ${updateMorningPlaylistResponse.status}`);
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

async function getTrackUri(trackConfig: TrackConfig, accessToken: string, iteration: number): Promise<string> {
  switch (trackConfig.source_type) {
    case "album": {
      if (trackConfig.mode !== "iterative") {
        throw new Error("Unsupported mode");
      }
      return await getIterativeAlbumTrackUri(trackConfig.source_id, iteration, accessToken);
    }
    case "playlist": {
      if (trackConfig.mode !== "random") {
        throw new Error("Unsupported mode");
      }
      return await getRandomPlaylistTrackUri(trackConfig.source_id, accessToken);
    }
    case "podcast": {
      if (trackConfig.mode !== "latest") {
        throw new Error("Unsupported mode");
      }
      return await getLatestPodcastEpisodeUri(trackConfig.source_id, accessToken);
    }
    default: {
      throw new Error("Unsupported source_type");
    }
  }
}