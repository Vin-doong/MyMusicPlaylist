require('dotenv').config(); // .env 파일 로드
const express = require('express');
const path = require('path');
const session = require('express-session');
const cors = require('cors');

const app = express();

// CORS 설정 -0106
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

// EJS 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 미들웨어 설정
app.use(express.static(path.join(__dirname, 'public'))); // 정적 파일 제공
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // 폼 데이터 파싱

// 세션 설정
app.use(
  session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
  })
);

// 라우트 설정
app.use('/auth', require('./routes/auth'));
app.use('/main', require('./routes/main'));
app.use('/main/playlist', require('./routes/playlist'));
app.use('/main/profile', require('./routes/profile'));
app.use('/main/mood', require('./routes/mood'));
app.use('/main/weather', require('./routes/weather'));
app.use('/main/top100', require('./routes/top100'));
app.use('/main/random', require('./routes/random'));

// 기본 라우트 (홈 페이지)
app.get('/', (req, res) => {
  res.render('index'); // index.ejs 렌더링
});

module.exports = app;
