const express = require('express');
const axios = require('axios');
const querystring = require('querystring');
const router = express.Router();

// Spotify 로그인 페이지로 리다이렉트
router.get('/login', (req, res) => {
  const scopes = [
    'user-read-private',
    'user-read-email',
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

// Callback 처리 (Authorization Code Flow)
router.get('/callback', async (req, res) => {
  const code = req.query.code || null;

  if (!code) {
    return res.status(400).send('인증 코드가 없습니다.');
  }

  try {
    // 액세스 토큰 요청
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

    console.log('Access Token:', access_token);
    console.log('Refresh Token:', refresh_token);

    res.redirect('/main'); // 메인 페이지로 리다이렉트
  } catch (error) {
    console.error('토큰 요청 실패:', error.response?.data || error.message);
    res.status(500).send('토큰 요청 실패');
  }
});

// 현재 토큰 정보 확인
router.get('/token', (req, res) => {
  if (!req.session.accessToken) {
    return res.status(401).json({ error: '토큰이 없습니다. 다시 로그인하세요.' });
  }

  res.json({
    accessToken: req.session.accessToken,
    refreshToken: req.session.refreshToken,
    expiresAt: req.session.expiresAt,
  });
});

// 로그아웃 라우트
router.get('/logout', (req, res) => {
  // Clear session data
  req.session.destroy((err) => {
    if (err) {
      console.error('Session deletion failed:', err);
      return res.status(500).send('Logout failed');
    }

    // Clear client-side cookies
    res.clearCookie('connect.sid');

    // Spotify logout URL
    const spotifyLogoutURL = 'https://accounts.spotify.com/logout';

    // Send HTML with a delayed redirect
    res.send(`
      <html>
        <body>
          <p>You have been logged out from Spotify. Redirecting to the home page...</p>
          <script>
            // Log out from Spotify and redirect
            const spotifyLogout = () => {
              // Calculate the center of the screen for the popup
              const width = 500;
              const height = 600;
              const left = (window.screen.width / 2) - (width / 2);
              const top = (window.screen.height / 2) - (height / 2);

              // Open the Spotify logout popup in the center of the screen
              const logoutWindow = window.open(
                "${spotifyLogoutURL}",
                "_blank",
                \`width=\${width},height=\${height},top=\${top},left=\${left}\`
              );

              setTimeout(() => {
                if (logoutWindow) {
                  logoutWindow.close(); // Close the Spotify logout window after a delay
                }
                // Redirect to your application's home page
                window.location.href = '/';
              }, 2000); // Redirect after 2 seconds
            };

            spotifyLogout();
          </script>
        </body>
      </html>
    `);
  });
});

module.exports = router;
