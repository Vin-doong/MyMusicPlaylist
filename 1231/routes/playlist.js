const express = require('express');
const router = express.Router();
const SpotifyWebApi = require('spotify-web-api-node');

// 스포티파이 API 설정
const spotifyApi = new SpotifyWebApi();

// 마이 플레이리스트 페이지
router.get('/', async (req, res) => {
  try {
    const playlists = await spotifyApi.getUserPlaylists();
    res.json(playlists.body.items); // JSON 형태로 반환
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching playlists');
  }
});

module.exports = router;
