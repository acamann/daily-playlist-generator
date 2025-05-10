import { getStore } from "@netlify/blobs";
import type { Context } from "@netlify/functions";

const SPURGEON_PODCAST_ID = "3K7ozH48m7PKoRTkJ4Cdc0";
const INSTRUMENTAL_PLAYLIST_ID = "5mgpMDPflYQRXU7XgYsRMe";
const SYNESTHESIA_ALBUM_ID = "4D7S7xyJToJ28MVcSH3YFo";

const DAILY_COMMUTE_MORNING_PLAYLIST_ID = "2izrV7kDCebemseu3qeo3x";

const ONE_DAY = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
const NOW = new Date();
const TODAY = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate()).getTime();
const PLAYLIST_BIRTHDAY = new Date(2025, 4, 8).getTime(); // 5/8/25

const PLAYLIST_ITERATION = Math.round(Math.abs((TODAY - PLAYLIST_BIRTHDAY) / ONE_DAY));

export default async (req: Request, context: Context) => {
  const accessToken = await refreshToken();

  if (!accessToken) {
    return new Response("Unable to Refresh Token", { status: 401 });
  }

  // construct playlist
  const playlistUris: string[] = [];
  playlistUris.push(await getIterativeAlbumTrackUri(SYNESTHESIA_ALBUM_ID, accessToken));
  playlistUris.push(await getLatestPodcastEpisodeUri(SPURGEON_PODCAST_ID, accessToken));
  playlistUris.push(await getRandomPlaylistTrackUri(INSTRUMENTAL_PLAYLIST_ID, accessToken));
  
  // modify playlist by ID to replace with the above playlist
  const updateMorningPlaylistResponse = await fetch(`https://api.spotify.com/v1/playlists/${DAILY_COMMUTE_MORNING_PLAYLIST_ID}/tracks`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      uris: playlistUris
    })
  });

  return new Response(JSON.stringify(await updateMorningPlaylistResponse.json()));
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
  console.log("Refreshing Token");
  const body = await fetch(url, payload);
  const response = await body.json();

  if (response.refresh_token) {
    await store.set("refresh_token", response.refresh_token);
    console.log("Token Refreshed, new refresh token stored");
  }

  return response.access_token;
}

async function getLatestPodcastEpisodeUri(podcastId: string, accessToken: string): Promise<string> {
  const episodesResponse = await fetch(`https://api.spotify.com/v1/shows/${podcastId}/episodes?limit=1`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  const episodesBody = await episodesResponse.json();
  // TODO: validate response for sane error handling
  const episodeUri = episodesBody.items[0].uri;
  console.log(`Podcast ${podcastId} :: Latest :: Episode URI ${episodeUri}`);
  return episodeUri;
}

async function getRandomPlaylistTrackUri(playlistId: string, accessToken: string): Promise<string> {
  const playlistTracksResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  let tracksBody = await playlistTracksResponse.json();
  const totalTracks = tracksBody.total;
  const responseTracksLength = tracksBody.items.length;
  const randomIndex = Math.floor(Math.random() * totalTracks);
  let itemIndex = randomIndex;
  if (randomIndex >= responseTracksLength) {
    // the current iteration is beyond the first page, need to get it individually
    console.log("Need to fetch playlist tracks at offset");
    const playlistTracksResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=1&offset=${randomIndex}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    tracksBody = await playlistTracksResponse.json();
    itemIndex = 0;
  }
  const trackUri = tracksBody.items[itemIndex].track.uri;
  console.log(`Playlist ${playlistId} :: Playlist Length ${totalTracks} :: Random :: Track Index ${randomIndex} :: Track URI ${trackUri}`);
  return trackUri;
}

async function getIterativeAlbumTrackUri(albumId: string, accessToken: string): Promise<string> {
  const albumTracksResponse = await fetch(`https://api.spotify.com/v1/albums/${albumId}/tracks?limit=50`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  const tracksBody = await albumTracksResponse.json();
  const totalTracks = tracksBody.total;
  const tracksLength = tracksBody.items.length;
  const iterativeIndex = PLAYLIST_ITERATION % totalTracks;
  if (iterativeIndex >= tracksLength) {
    // the current iteration is beyond the first page, need to get it individually
    console.log("Need to fetch album tracks at offset");
    const albumTracksResponse = await fetch(`https://api.spotify.com/v1/albums/${albumId}/tracks?limit=1&offset=${iterativeIndex}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    const tracksBody = await albumTracksResponse.json();
    const trackUri = tracksBody.items[0].uri;
    console.log(`Album ${albumId} :: Album Length ${totalTracks} :: Iteration ${PLAYLIST_ITERATION} :: Track Index ${iterativeIndex} :: Track URI ${trackUri}`);
    return trackUri;    
  }
  const trackUri = tracksBody.items[iterativeIndex].uri;
  console.log(`Album ${albumId} :: Album Length ${totalTracks} :: Iteration ${PLAYLIST_ITERATION} :: Track Index ${iterativeIndex} :: Track URI ${trackUri}`);
  return trackUri;
}