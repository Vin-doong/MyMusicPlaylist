const SpotifyWebApi = require('spotify-web-api-node');
const { getAccessToken } = require('../services/spotifyService');

async function ensureSpotifyToken(req, res, next) {
  try {
    const token = await getAccessToken();

    // Spotify API 인스턴스 생성
    const spotifyApi = new SpotifyWebApi();
    spotifyApi.setAccessToken(token); // 액세스 토큰 설정

    // 요청 객체에 Spotify API 인스턴스 저장
    req.spotifyApi = spotifyApi;

    console.log('Spotify Access Token 설정 완료:', token); // 디버깅용 로그
    next();
  } catch (error) {
    console.error('Spotify 토큰 갱신 실패:', error.message || error);
    res.status(500).send('Spotify 인증 실패');
  }
}

module.exports = { ensureSpotifyToken };
