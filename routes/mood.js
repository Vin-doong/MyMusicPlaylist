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



module.exports = router;
