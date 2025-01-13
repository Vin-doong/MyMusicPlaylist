const express = require('express');
const router = express.Router();
const { ensureSpotifyToken } = require('../middleware/spotifyToken'); // 토큰 미들웨어

router.get('/', ensureSpotifyToken, async (req, res) => {
  try {
    // Spotify API에서 사용자 정보 가져오기
    const userProfile = await req.spotifyApi.getMe();

    // 사용자 정보를 EJS에 전달하여 렌더링
    res.render('profile', { user: userProfile.body });
  } catch (error) {
    console.error('Spotify API 요청 실패:', error.message || error);
    res.status(500).send('회원정보를 가져오는 데 실패했습니다.');
  }
});

module.exports = router;
