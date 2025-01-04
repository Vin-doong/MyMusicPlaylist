const express = require('express');
const router = express.Router();
const { ensureSpotifyToken } = require('../middleware/spotifyToken');

// 메인 페이지
router.get('/', ensureSpotifyToken, (req, res) => {
  const user = req.session.user || null;
  res.render('main', { user });
});

module.exports = router;
