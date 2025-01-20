const express = require('express');
const router = express.Router();
const { ensureSpotifyToken } = require('../middleware/spotifyToken');

// 미리 지정된 키워드 배열
const predefinedKeywords = [
  'Calm','Relaxing','Energetic','Upbeat','Chill','Nostalgic','Romantic','Melancholic','Motivational','Inspirational',
'Morning','Night','Sunrise','Sunset','Late Night','Afternoon','Weekend','Party','Midnight','Coffee Break',
'Pop','Rock','Hip-Hop','Jazz','Classical','EDM','Reggae','Folk','Blues','Indie',
'Workout','Study','Driving','Gaming','Meditation','Cooking','Dancing','Road Trip','Sleep','Rainy Day',
'Happy','Sad','Love','Heartbreak','Excited','Peaceful','Angry','Lonely','Hopeful','Confident',
'Summer','Winter','Spring','Autumn','Holiday','Christmas','Halloween','New Year','Vacation','Cozy',
'Wedding','Birthday','Anniversary','Graduation','First Date','Breakup','Reunion','Proposal','Celebration','Farewell',
'Gym','Beach','Office','Park','Home','Commute','Yoga','Hiking','Camping','Shopping',
'English','Korean','Spanish','French','Japanese','Italian','German','Portuguese','Chinese','Arabic',
'Acoustic','Instrumental','Lo-fi','Retro','Ambient','Mashup','Live','Covers','Duets','Originals'
];

// 랜덤 검색 페이지 렌더링
router.get('/', (req, res) => {
  res.render('random');
});

// 랜덤 검색 처리
router.post('/', ensureSpotifyToken, async (req, res) => {
  try {
    // 랜덤 키워드 선택
    const randomKeyword = predefinedKeywords[Math.floor(Math.random() * predefinedKeywords.length)];
    console.log('랜덤 키워드:', randomKeyword);

    // Spotify API 인스턴스 사용
    const spotifyApi = req.spotifyApi;

    // Spotify에서 트랙 검색
    const data = await spotifyApi.searchTracks(randomKeyword, { limit: 50 });
    const tracks = data.body.tracks.items;

    if (!tracks || tracks.length === 0) {
      console.error(`"${randomKeyword}" 키워드로 검색된 결과가 없습니다.`);
      return res.status(404).json({ error: `검색 결과가 없습니다. 키워드: ${randomKeyword}` });
    }

    // 검색된 트랙 중 랜덤 트랙 선택
    const randomIndex = Math.floor(Math.random() * tracks.length);
    const randomTrack = tracks[randomIndex];

    // 결과 반환
    res.json({
      keyword: randomKeyword,
      track: {
        name: randomTrack.name,
        artists: randomTrack.artists.map((artist) => artist.name),
        url: randomTrack.external_urls.spotify,
        thumbnail: randomTrack.album.images[0]?.url || null, // 앨범 커버 이미지
        uri: randomTrack.uri, // Spotify URI 추가
      },
    });
  } catch (error) {
    console.error('Spotify API 호출 실패:', error.response?.data || error.message);
    res.status(500).json({ error: 'Spotify API 호출 실패' });
  }
});

module.exports = router;
