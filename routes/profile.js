const express = require('express');
const router = express.Router();

// 프로필 페이지
router.get('/', (req, res) => {
  const user = req.session.user || { name: '게스트', email: 'unknown@example.com' };
  res.render('profile', { user });
});

module.exports = router;
