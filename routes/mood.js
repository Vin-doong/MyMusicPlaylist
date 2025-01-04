const express = require('express');
const router = express.Router();
const { ensureSpotifyToken } = require('../middleware/spotifyToken');

router.get('/', (req, res) => {
  res.render('mood');
});

router.post('/', ensureSpotifyToken, async (req, res) => {
  try {
    const spotifyApiInstance = req.spotifyApi; // ensureSpotifyToken에서 설정한 Spotify API 인스턴스 사용

    const { selectedValues } = req.body;

    if (!selectedValues || selectedValues.length === 0) {
      return res.status(400).json({ error: '무드를 선택해주세요.' });
    }

    const query = selectedValues.join(' ');
    console.log('검색어:', query);

    const data = await spotifyApiInstance.searchTracks(query, { limit: 10 });
    console.log('Spotify API 응답:', data.body.tracks.items);

    res.json(data.body.tracks.items);
  } catch (error) {
    console.error('Spotify API 호출 실패:', error.response?.data || error.message);
    res.status(500).json({ error: 'Spotify API 호출 실패' });
  }
});

module.exports = router;
