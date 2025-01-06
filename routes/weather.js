const express = require('express');
const router = express.Router();
const axios = require('axios');
const { ensureSpotifyToken } = require('../middleware/spotifyToken');

const KMA_API_KEY = process.env.KMA_API_KEY; // KMA API 키

// 날씨 검색 페이지 렌더링
router.get('/', (req, res) => {
  res.render('weather'); // weather.ejs 렌더링
});

// 날씨 데이터 및 Spotify 노래 검색 처리
router.post('/', ensureSpotifyToken, async (req, res) => {
  try {
    const { lat, lon } = req.body;

    if (!lat || !lon) {
      return res.status(400).json({ error: '위도와 경도가 필요합니다.' });
    }

    console.log('요청받은 위도:', lat, '경도:', lon);

    // KMA API 좌표 변환
    const kmaUrl = `https://apihub.kma.go.kr/api/typ01/cgi-bin/url/nph-dfs_xy_lonlat?lat=${lat}&lon=${lon}&help=0&authKey=${KMA_API_KEY}`;
    const kmaResponse = await axios.get(kmaUrl);
    const kmaLines = kmaResponse.data.split('\n');
    const kmaDataLine = kmaLines[2]?.trim();
    if (!kmaDataLine) {
      return res.status(500).json({ error: 'KMA API에서 유효한 데이터를 가져오지 못했습니다.' });
    }
    const kmaData = kmaDataLine.split(',');
    const nx = kmaData[2];
    const ny = kmaData[3];

    console.log('KMA 변환 좌표:', { nx, ny });

    // 현재 날짜 및 시간 가져오기
    const { baseDate, baseTime } = getCurrentKmaDateTime();

    // KMA 날씨 데이터 가져오기
    const weatherUrl = `https://apihub.kma.go.kr/api/typ02/openApi/VilageFcstInfoService_2.0/getUltraSrtFcst?pageNo=1&numOfRows=20&dataType=JSON&base_date=${baseDate}&base_time=${baseTime}&nx=${nx}&ny=${ny}&authKey=${KMA_API_KEY}`;


    console.log('KMA 날씨 API URL:', weatherUrl);

    const weatherResponse = await axios.get(weatherUrl);
    const items = weatherResponse.data.response.body.items.item;

    console.log('KMA 날씨 데이터:', items);

    // 날씨 데이터 처리
    const weatherCode = processKmaWeatherData(items);
    const weatherKeywords = generateWeatherKeywords(weatherCode);

    if (!weatherKeywords.length) {
      return res.status(400).json({ error: '적합한 날씨 키워드를 생성할 수 없습니다.' });
    }

    console.log('생성된 날씨 키워드:', weatherKeywords);

    // Spotify API 호출
    const spotifyApiInstance = req.spotifyApi;
    const query = weatherKeywords.join(' ');
    const spotifyResponse = await spotifyApiInstance.searchTracks(query, { limit: 10 });

    res.json(spotifyResponse.body.tracks.items);
  } catch (error) {
    console.error('오류 발생:', error.message || error);
    res.status(500).json({ error: 'KMA API 호출 또는 Spotify API 호출 실패' });
  }
});

// 현재 날짜 및 시간 가져오기 (KMA 기준)
function getCurrentKmaDateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  let hours = now.getHours();
  const minutes = '30';

  if (now.getMinutes() < 30) {
    hours -= 1;
  }
  if (hours < 0) {
    hours = '00';
  } else {
    hours = String(hours).padStart(2, '0');
  }
  
  return {
    baseDate: `${year}${month}${day}`,
    baseTime: `${hours}${minutes}`,
  };
}

// KMA 날씨 데이터를 처리하여 날씨 코드 생성
function processKmaWeatherData(items) {
  const skyItem = items.find(item => item.category === 'SKY');
  const rainItem = items.find(item => item.category === 'PTY');

  const skyValue = skyItem?.fcstValue || 'N/A';
  const rainValue = rainItem?.fcstValue || 'N/A';

  if (skyValue === '1' && rainValue === '0') return 'clear';
  if ((skyValue === '3' || skyValue === '4') && rainValue === '0') return 'cloudy';
  if (rainValue === '1' || rainValue === '2') return 'rainy';
  if (rainValue === '3') return 'snowy';
  return 'unknown';
}

// 날씨 설명에 따른 키워드 생성 함수
function generateWeatherKeywords(weatherCode) {
  const keywords = [];
  if (weatherCode === 'clear') {
    keywords.push('sunny', 'happy', 'energetic');
  } else if (weatherCode === 'cloudy') {
    keywords.push('cloudy', 'calm', 'soft');
  } else if (weatherCode === 'rainy') {
    keywords.push('rainy', 'chill', 'relaxing');
  } else if (weatherCode === 'snowy') {
    keywords.push('snowy', 'winter', 'cozy');
  }
  return keywords;
}

module.exports = router;
