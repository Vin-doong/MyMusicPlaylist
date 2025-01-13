const SpotifyWebApi = require('spotify-web-api-node');

async function ensureSpotifyToken(req, res, next) {
  try {
    // 세션에서 액세스 토큰 가져오기
    const { accessToken, refreshToken, expiresAt } = req.session;

    // 세션에 토큰이 없는 경우 로그인 페이지로 리디렉트
    if (!accessToken || !refreshToken) {
      return res.redirect('/auth/login');
    }

    const spotifyApi = new SpotifyWebApi({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      redirectUri: process.env.SPOTIFY_REDIRECT_URI,
    });

    // 토큰 만료 여부 확인 및 갱신
    if (Date.now() >= expiresAt) {
      try {
        const data = await spotifyApi.refreshAccessToken();
        spotifyApi.setAccessToken(data.body['access_token']);

        // 세션에 새 토큰 저장
        req.session.accessToken = data.body['access_token'];
        req.session.expiresAt = Date.now() + data.body['expires_in'] * 1000;

        console.log('Spotify 토큰 갱신 완료:', data.body['access_token']);
      } catch (error) {
        console.error('Spotify 토큰 갱신 실패:', error.message || error);
        return res.status(500).send('Spotify 토큰 갱신 실패');
      }
    } else {
      spotifyApi.setAccessToken(accessToken); // 세션의 기존 토큰 설정
    }

    req.spotifyApi = spotifyApi; // 요청 객체에 Spotify API 인스턴스 추가
    next();
  } catch (error) {
    console.error('Spotify 토큰 처리 실패:', error.message || error);
    res.status(500).send('Spotify 인증 실패');
  }
}

module.exports = { ensureSpotifyToken };
