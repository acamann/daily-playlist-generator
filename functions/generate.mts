import { getStore } from "@netlify/blobs";
import type { Context } from "@netlify/functions";
import { setupLogging } from "./utils/logging.mjs";
import { getAccessToken, getIterativeAlbumTrackUri, getIterativePlaylistTrackUri, getLatestPodcastEpisodeUri, getLatestUnplayedPodcastEpisodeUri, getRandomPlaylistTrackUri, getTodaysPodcastEpisodeUri } from "./utils/spotify.mjs";
import { getDaysSince } from "./utils/date.mjs";
import { readFileSync } from "fs";

const DEFAULT_PLAYLIST = "morning";

export default async (req: Request, context: Context) => {
  const getLogs = setupLogging();

  const playlist = new URL(req.url).searchParams.get('playlist') ?? DEFAULT_PLAYLIST;
  if (!["morning", "afternoon"].includes(playlist)) {
    console.log(`Unknown playlist value in query: ${playlist}`);
    return new Response("Unknown playlist", { status: 409 });
  }
  
  // TODO: consider parsing all possible configs outside of the function to avoid on each request
  const playlistConfigPath = require.resolve(`./config/${playlist}.json`);
  const playlistConfigJson = readFileSync(playlistConfigPath, "utf-8");
  const playlistConfig = JSON.parse(playlistConfigJson) as PlaylistConfig;
  
  const accessToken = await getToken();
  if (!accessToken) {
    return new Response("Unable to Refresh Access Token", { status: 401 });
  }

  const iteration = getDaysSince(new Date(playlistConfig.creation_date));
  console.log(`Generating Playlist ${playlistConfig.name} :: Daily Iteration ${iteration}`);

  const playlistUris: string[] = [];
  for (let i = 0; i < playlistConfig.tracks.length; i++) {
    const trackUri = await getTrackUri(playlistConfig.tracks[i], accessToken, iteration);
    if (trackUri) {
      playlistUris.push(trackUri);
    }
  }
  
  // modify playlist by ID to replace with the above playlist
  console.log(`Updating Playlist ${playlistConfig.name} :: Id ${playlistConfig.id}`);
  const updateMorningPlaylistResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlistConfig.id}/tracks`, {
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

async function getTrackUri(trackConfig: TrackConfig, accessToken: string, iteration: number): Promise<string | null> {
  if (trackConfig.day_of_week && new Date().getDay() !== trackConfig.day_of_week) {
    // if day of the week is configured, only include the track if today is that day
    return null;
  }
  switch (trackConfig.source_type) {
    case "album_iterative_track": {
      return await getIterativeAlbumTrackUri(trackConfig.source_id, iteration, accessToken);
    }
    case "playlist_random_track": {
      return await getRandomPlaylistTrackUri(trackConfig.source_id, accessToken);
    }
    case "playlist_iterative_track": {
      return await getIterativePlaylistTrackUri(trackConfig.source_id, iteration, accessToken);
    }
    case "podcast_latest_episode": {
      return await getLatestPodcastEpisodeUri(trackConfig.source_id, accessToken);
    }
    case "podcast_latest_unplayed": {
      return await getLatestUnplayedPodcastEpisodeUri(trackConfig.source_id, accessToken, 1);
    }
    case "podcast_todays_episode": {
      return await getTodaysPodcastEpisodeUri(trackConfig.source_id, accessToken);
    }
    default: {
      console.log(`Unsupported source_type: ${trackConfig.source_type}`);
      return null;
    }
  }
}