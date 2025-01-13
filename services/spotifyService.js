let accessToken = null;
let expiresAt = null;

async function getAccessToken() {
  if (accessToken && expiresAt && Date.now() < expiresAt) {
    return accessToken; // 기존 토큰 반환
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Spotify 토큰 요청 실패: ${errorData.error_description}`);
  }

  const data = await response.json();
  accessToken = data.access_token;
  expiresAt = Date.now() + data.expires_in * 1000;

  return accessToken;
}

module.exports = { getAccessToken };
