const express = require('express');
const router = express.Router();
const { ensureSpotifyToken } = require('../middleware/spotifyToken');

router.get('/', (req, res) => {
  res.render('weather');
});

// 날씨 기반 노래 검색
router.post('/', ensureSpotifyToken, async (req, res) => {
  try {
    const spotifyApiInstance = req.spotifyApi;

    const weatherKeywords = req.body;

    if (!weatherKeywords || weatherKeywords.length === 0) {
      return res.status(400).json({ error: '날씨 키워드가 제대로 입력되지 않았습니다.' });
    }
    const query = weatherKeywords.join(' ');
    console.log('검색어:', query);

    const data = await spotifyApiInstance.searchTracks(query, { limit: 10 });
    console.log('Spotify API 응답:', data.body.tracks.items);

    res.json(data.body.tracks.items);
  } catch (error) {
    console.error('날씨 기반 노래 검색 실패:', error);
    res.status(500).send('날씨 기반 노래 검색 실패');
  }
});

module.exports = router;
