const express = require('express');
const router = express.Router();
const { ensureSpotifyToken } = require('../middleware/spotifyToken');

router.get('/', (req, res) => {
  res.render('mood');
});

router.post('/', ensureSpotifyToken, async (req, res) => {
  try {
    const spotifyApiInstance = req.spotifyApi;
    const { selectedValues } = req.body;

    if (!selectedValues || selectedValues.length === 0) {
      return res.status(400).json({ error: '무드를 선택해주세요.' });
    }

    const query = selectedValues.join(' ');
    const data = await spotifyApiInstance.searchTracks(query, { limit: 10 });

    if (!data.body.tracks.items || data.body.tracks.items.length === 0) {
      return res.status(404).json({ error: '해당 무드로 검색된 결과가 없습니다.' });
    }
    
    res.json(data.body.tracks.items);
  } catch (error) {
    console.error('Spotify API 호출 실패:', error.message || error.response?.data);
    res.status(500).json({ error: 'Spotify API 호출 실패' });
  }
});

// 사용자 ID 가져오기 & 플레이리스트 생성 & 곡 추가
router.get('/onthehouse',ensureSpotifyToken, async (req, res) => {
  try {
  // Spotify API 호출
  console.log('Spotify API 객체 확인:', req.spotifyApi);
  const spotifyApiInstance = req.spotifyApi;
  
  //Spotify API id가져오기
  const userProfile = await spotifyApiInstance.getMe();
  const userId = userProfile.body.id
  console.log('사용자 id:', userId);

  // 요청쿼리에서 playlistName과 playlistDescription tracks를 가져오기
  const { playlistName, playlistDescription,publicOption, tracks } = req.query;
  console.log('플리이름:', playlistName,'/플리 설명:', playlistDescription
    ,'/공공옵션:', publicOption
    ,'/tracks:', tracks);
  /* {=================나중에 플리이름 중복검사 추가하기=================} */

  if (!playlistName || !playlistDescription || !tracks) {
      return res.status(400).json({ error: '필수 매개변수가 없습니다.' });
  }
  // trackUris를 배열로 복원
  const Tracks = JSON.parse(tracks);
  if (!Array.isArray(Tracks)) {
    return res.status(400).json({ error: 'trackUris가 유효하지 않습니다.' });
  }

  // Spotify API 플레이리스트 생성
  const playlist = await spotifyApiInstance.createPlaylist(userId, {
    name: playlistName,
    description: playlistDescription,
    public: publicOption,
  });
  const playlistId = playlist.body.id;
  console.log('생성된 플레이리스트 ID:', playlistId);

  // Spotify API 플레이리스트에 곡 추가
  const addTracks = await spotifyApiInstance.addTracksToPlaylist(playlistId, Tracks);

    res.json({ message: '플레이리스트 생성 및 곡 추가 완료', addTracks});
  } catch (error) {
    console.error('플레이리스트생성 실패:', error.message);
    res.status(500).json({ error: '사용자 ID 가져오기 및 플레이리스트 생성 실패' });
  }
});



module.exports = router;
