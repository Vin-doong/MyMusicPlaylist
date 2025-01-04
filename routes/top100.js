const express = require('express');
const router = express.Router();
const { ensureSpotifyToken } = require('../middleware/spotifyToken');

// Top100 플레이리스트 렌더링
router.get('/', ensureSpotifyToken, (req, res) => {
  // 특정 Spotify 플레이리스트를 렌더링
  res.render('top100', { playlistId: '4cRo44TavIHN54w46OqRVc' });
});

module.exports = router;
