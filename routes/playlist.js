const express = require('express');
const router = express.Router();
const { ensureSpotifyToken } = require('../middleware/spotifyToken');
const SpotifyWebApi = require('spotify-web-api-node');

const spotifyApi = new SpotifyWebApi();

// 플레이리스트 페이지
router.get('/', ensureSpotifyToken, async (req, res) => {
  try {
    const playlists = await spotifyApi.getUserPlaylists();
    res.render('playlist', { playlists: playlists.body.items });
  } catch (error) {
    console.error('플레이리스트 가져오기 실패:', error);
    res.status(500).send('플레이리스트를 가져오지 못했습니다.');
  }
});

module.exports = router;
