const express = require('express');
const router = express.Router();
const SpotifyWebApi = require('spotify-web-api-node');
const { getAccessToken } = require('../services/spotifyService');

const spotifyApi = new SpotifyWebApi();

// 공통 토큰 갱신 미들웨어
async function ensureSpotifyToken(req, res, next) {
  try {
    const token = await getAccessToken(); // 새 토큰 가져오기
    spotifyApi.setAccessToken(token); // Spotify API에 토큰 설정
    next();
  } catch (error) {
    console.error('토큰 갱신 실패:', error);
    res.status(500).send('Spotify 인증 실패');
  }
}

// 메인 페이지
router.get('/', ensureSpotifyToken, (req, res) => {
  const user = req.session.user || null; // 세션에서 사용자 정보 가져오기
  res.render('main', { user }); // main.ejs 렌더링
});

// 회원정보 페이지
router.get('/profile', (req, res) => {
  const user = req.session.user || { name: '게스트', email: 'unknown@example.com' }; // 기본 사용자 정보
  res.render('profile', { user }); // 사용자 정보 렌더링
});

// 나의 플레이리스트 페이지
router.get('/playlist', ensureSpotifyToken, async (req, res) => {
  try {
    const playlists = await spotifyApi.getUserPlaylists();
    res.render('playlist', { playlists: playlists.body.items });
  } catch (error) {
    console.error('플레이리스트 가져오기 실패:', error);
    res.status(500).send('플레이리스트를 가져오지 못했습니다.');
  }
});

// 무드 검색 페이지 렌더링
router.get('/mood', (req, res) => {
  res.render('mood'); // mood.ejs 렌더링
});

// 무드 기반 노래 검색
router.post('/mood', ensureSpotifyToken, async (req, res) => {
  try {
    const { selectedValues } = req.body;
    const query = selectedValues.join(' '); // 검색어 생성
    const data = await spotifyApi.searchTracks(query, { limit: 10 });
    res.json(data.body.tracks.items);
  } catch (error) {
    console.error('무드 기반 노래 검색 실패:', error);
    res.status(500).send('무드 기반 노래 검색 실패');
  }
});

// 날씨에 따른 노래 검색
router.get('/weather', ensureSpotifyToken, async (req, res) => {
  try {
    const weatherKeyword = 'sunny'; // 예제 키워드
    const data = await spotifyApi.searchTracks(weatherKeyword, { limit: 10 });
    res.json(data.body.tracks.items);
  } catch (error) {
    console.error('날씨 기반 노래 검색 실패:', error);
    res.status(500).send('날씨 기반 노래 검색 실패');
  }
});

// Top50 노래 검색
router.get('/top50', ensureSpotifyToken, async (req, res) => {
  try {
    const data = await spotifyApi.getPlaylist('37i9dQZEVXbMDoHDwVN2tF');
    res.json(data.body.tracks.items);
  } catch (error) {
    console.error('Top50 노래 검색 실패:', error);
    res.status(500).send('Top50 노래 검색 실패');
  }
});

// 랜덤 노래 검색
// 랜덤 검색 페이지 렌더링
router.get('/random', (req, res) => {
  res.render('random'); // random.ejs를 렌더링
});
router.post('/random', async (req, res) => {
  const { keywords } = req.body; // 클라이언트로부터 키워드 배열 받기
  const accessToken = req.session.accessToken;

  // 액세스 토큰 확인
  if (!accessToken) {
    console.error('액세스 토큰이 없습니다.');
    return res.status(401).json({ error: '로그인 상태가 만료되었습니다. 다시 로그인해주세요.' });
  }

  // 키워드 배열 확인
  if (!keywords || keywords.length === 0) {
    console.error('키워드가 비어 있습니다.');
    return res.status(400).json({ error: '키워드를 입력해주세요.' });
  }

  try {
    // 랜덤으로 키워드 선택
    const randomKeyword = keywords[Math.floor(Math.random() * keywords.length)];

    console.log('사용자 입력 키워드:', keywords);
    console.log('랜덤 선택 키워드:', randomKeyword);

    // Spotify API 호출
    const response = await axios.get(`https://api.spotify.com/v1/search`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      params: {
        q: randomKeyword,
        type: 'track',
        limit: 50, // 최대 50곡
      },
    });

    const tracks = response.data.tracks.items;

    if (tracks.length === 0) {
      console.error(`키워드 "${randomKeyword}"로 검색 결과가 없습니다.`);
      return res.status(404).json({ error: `검색 결과가 없습니다. 키워드: ${randomKeyword}` });
    }

    // 랜덤 트랙 선택
    const randomIndex = Math.floor(Math.random() * tracks.length);
    const randomTrack = tracks[randomIndex];

    res.json({
      keyword: randomKeyword,
      track: {
        name: randomTrack.name,
        artists: randomTrack.artists.map((artist) => artist.name),
        url: randomTrack.external_urls.spotify,
      },
    });
  } catch (error) {
    console.error('Spotify API 호출 실패:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Spotify API 호출 실패' });
  }
});


module.exports = router;
