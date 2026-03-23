import { NextResponse } from 'next/server';

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const refresh_token = process.env.SPOTIFY_REFRESH_TOKEN;

async function getAccessToken() {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64'),
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refresh_token!,
    }),
  });

  const data = await response.json();
  return data.access_token;
}

export async function GET() {
  if (!refresh_token) {
    return NextResponse.json({ isPlaying: false, error: 'Spotify token not configured' });
  }

  try {
    const access_token = await getAccessToken();
    const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing?additional_types=episode', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
      cache: 'no-store'
    });

    if (response.status === 204) {
      return NextResponse.json({ isPlaying: false, status: 'NO_CONTENT' });
    }

    if (response.status > 400) {
      return NextResponse.json({ isPlaying: false, status: 'ERROR' });
    }

    const song = await response.json();
    
    if (!song.item) {
      console.log('Spotify: No item playing');
      return NextResponse.json({ isPlaying: false, status: 'NO_ITEM' });
    }

    const isPlaying = song.is_playing;
    const isEpisode = song.currently_playing_type === 'episode';
    
    console.log('Spotify Data:', {
      type: song.currently_playing_type,
      title: song.item.name,
      artist: isEpisode ? song.item.show?.name : song.item.artists?.[0]?.name
    });
    
    const title = song.item.name;
    const artist = isEpisode 
      ? song.item.show.name 
      : song.item.artists.map((_artist: { name: string }) => _artist.name).join(', ');
    
    const album = isEpisode ? song.item.show.publisher : song.item.album.name;
    const albumImageUrl = isEpisode ? song.item.images[0].url : song.item.album.images[0].url;
    
    const progressMs = song.progress_ms;
    const durationMs = song.item.duration_ms;

    return NextResponse.json({
      isPlaying,
      title,
      artist,
      album,
      albumImageUrl,
      progressMs,
      durationMs,
    });
  } catch (error) {
    console.error('Spotify API Error:', error);
    return NextResponse.json({ isPlaying: false, error: 'Failed to fetch Spotify status' });
  }
}
