let accessToken = null;
let expireToken = null;

// Access Token 받기
async function getAccessToken() {
  if (accessToken && expireToken && Date.now() < expireToken) {
    return accessToken;
  }

  const authParam = {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body:
      "grant_type=client_credentials&client_id=" +
      process.env.SPOTIFY_CLIENT_ID +
      "&client_secret=" +
      process.env.SPOTIFY_CLIENT_SECRET
  };

  // 새로운 토큰 요청
  const res = await fetch("https://accounts.spotify.com/api/token", authParam);

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(`토큰 요청 실패: ${res.status} - ${errorData.error_description}`);
  }

  const data = await res.json();
  console.log("토큰 응답 데이터:", data);

  // 새로운 토큰 저장
  accessToken = data.access_token;
  expireToken = Date.now() + data.expires_in * 1000;

  return accessToken;
}

module.exports = { getAccessToken };
