const express = require('express');
const router = express.Router();
const { ensureSpotifyToken } = require('../middleware/spotifyToken');

// 플레이리스트 목록 가져오기
router.get('/', ensureSpotifyToken, async (req, res) => {
  try {
    const playlists = await req.spotifyApi.getUserPlaylists();
    res.render('myplaylist', { playlists: playlists.body.items });
  } catch (error) {
    console.error('플레이리스트 가져오기 실패:', error.message || error);
    res.status(500).send('플레이리스트를 가져오는 데 실패했습니다.');
  }
});

// 특정 플레이리스트의 트랙 가져오기
router.get('/:playlistId/tracks', ensureSpotifyToken, async (req, res) => {
  const { playlistId } = req.params;

  try {
    const tracks = await req.spotifyApi.getPlaylistTracks(playlistId);
    const trackData = tracks.body.items.map(item => ({
      name: item.track.name,
      artists: item.track.artists,
      album: item.track.album,
    }));

    res.json(trackData);
  } catch (error) {
    console.error('트랙 가져오기 실패:', error.message || error);
    res.status(500).send('트랙을 가져오는 데 실패했습니다.');
  }
});


module.exports = router;
