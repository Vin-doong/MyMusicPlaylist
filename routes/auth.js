const express = require('express');
const axios = require('axios');
const querystring = require('querystring');
const router = express.Router();
const { ensureSpotifyToken } = require('../middleware/spotifyToken');

// Spotify 로그인
router.get('/login', (req, res) => {
  const scopes = [
    'user-read-private',
    'user-read-email',
    'user-modify-playback-state',
    'user-read-playback-state',
    'streaming', // Web Playback SDK에 필요
    'playlist-read-private',
    'playlist-modify-private',
  ];

  const authorizeURL =
    'https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: process.env.SPOTIFY_CLIENT_ID,
      scope: scopes.join(' '),
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
    });

  res.redirect(authorizeURL); // Spotify 인증 페이지로 리디렉트
});


// Spotify Callback
router.get('/callback', async (req, res) => {
  const code = req.query.code || null;

  if (!code) {
    return res.status(400).send('인증 코드가 없습니다.');
  }

  try {
    const response = await axios.post('https://accounts.spotify.com/api/token', null, {
      params: {
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
        client_id: process.env.SPOTIFY_CLIENT_ID,
        client_secret: process.env.SPOTIFY_CLIENT_SECRET,
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const { access_token, refresh_token, expires_in } = response.data;

    // 세션에 토큰 저장
    req.session.accessToken = access_token;
    req.session.refreshToken = refresh_token;
    req.session.expiresAt = Date.now() + expires_in * 1000;

    console.log('Access Token 저장:', access_token);
    res.redirect('/main'); // 메인 페이지로 리디렉트
  } catch (error) {
    console.error('토큰 요청 실패:', error.response?.data || error.message);
    res.status(500).send('토큰 요청 실패');
  }
});
// Token 갱신
router.get('/refresh-token', async (req, res, next) => {
  if (!req.session.refreshToken) return res.status(400).send('리프레시 토큰이 없습니다.');

  try {
    const response = await axios.post('https://accounts.spotify.com/api/token', null, {
      params: {
        grant_type: 'refresh_token',
        refresh_token: req.session.refreshToken,
        client_id: process.env.SPOTIFY_CLIENT_ID,
        client_secret: process.env.SPOTIFY_CLIENT_SECRET,
      },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    req.session.accessToken = response.data.access_token;
    req.session.expiresAt = Date.now() + response.data.expires_in * 1000;

    res.json({ accessToken: response.data.access_token });
  } catch (error) {
    next(error);
  }
});

router.get('/playback-token', async (req, res) => {
  if (!req.session.accessToken) {
    return res.status(401).json({ error: '로그인되지 않았습니다.' });
  }

  if (Date.now() >= req.session.expiresAt) {
    try {
      const response = await axios.post('https://accounts.spotify.com/api/token', null, {
        params: {
          grant_type: 'refresh_token',
          refresh_token: req.session.refreshToken,
          client_id: process.env.SPOTIFY_CLIENT_ID,
          client_secret: process.env.SPOTIFY_CLIENT_SECRET,
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const { access_token, expires_in } = response.data;
      req.session.accessToken = access_token;
      req.session.expiresAt = Date.now() + expires_in * 1000;
      console.log('Access Token 갱신 완료:', access_token);
    } catch (error) {
      console.error('토큰 갱신 실패:', error.response?.data || error.message);
      return res.status(500).json({ error: '토큰 갱신 실패' });
    }
  }

  res.json({ token: req.session.accessToken });
});



// 로그아웃
router.get('/logout', (req, res, next) => {
  req.session.destroy(err => {
    if (err) return next(err);
    res.clearCookie('connect.sid');
    res.send(`
      <html>
        <body>
          <p>Logged out. Redirecting...</p>
          <script>
            const spotifyLogout = () => {
              const width = 500, height = 600;
              const left = (window.screen.width / 2) - (width / 2);
              const top = (window.screen.height / 2) - (height / 2);

              const logoutWindow = window.open(
                'https://accounts.spotify.com/logout',
                '_blank',
                \`width=\${width},height=\${height},top=\${top},left=\${left}\`
              );

              setTimeout(() => {
                if (logoutWindow) logoutWindow.close();
                window.location.href = '/';
              }, 3000);
            };
            spotifyLogout();
          </script>
        </body>
      </html>
    `);
  });
});

// 공통 에러 처리
router.use((err, req, res, next) => {
  console.error('에러:', err.message || err);
  res.status(500).send(err.message || '서버 에러 발생');
});

module.exports = router;
