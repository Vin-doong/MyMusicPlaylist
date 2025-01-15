require('dotenv').config(); // .env 파일 로드
const express = require('express');
const path = require('path');
const app = express();
const port = 7777;
const session = require('express-session');

// EJS 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 라우트 임포트
const authRoutes = require('./routes/auth');
const mainRoutes = require('./routes/main');
const playlistRoutes = require('./routes/playlist');

// 미들웨어 설정
app.use(express.static(path.join(__dirname, 'public'))); // 정적 파일 제공
app.use(express.json());

// 세션 미들웨어 설정
app.use(
  session({
    secret: 'your-secret-key', // 비밀 키
    resave: false,
    saveUninitialized: true,
  })
);

// 라우트 설정
app.use('/auth', authRoutes);
app.use('/main', mainRoutes);
app.use('/playlist', playlistRoutes);

// 기본 라우트 (홈 페이지)
app.get('/', (req, res) => {
  res.render('index'); // index.ejs 렌더링
});

// 서버 시작
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
