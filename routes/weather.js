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

    console.log('KMA 날씨 데이터:', items.length);

    // 날씨 데이터 처리
    const weatherCode = processKmaWeatherData(items);
    const weatherKeywords = generateWeatherKeywords(weatherCode);
    console.log('날씨 코드:', weatherCode);
    console.log('생성된 날씨 키워드:', weatherKeywords);
    if (!weatherKeywords.length) {
      return res.status(400).json({ error: '적합한 날씨 키워드를 생성할 수 없습니다.' });
    }

    // 0113 raemi 기능추가(화면관련)
    const Imagepath = getWeatherImagepath(weatherCode)
    const addressUrl = `https://dapi.kakao.com/v2/local/geo/coord2address.JSON?x=${lon}&y=${lat}`;
    const addressResponse = await axios.get(addressUrl, {
      headers: {
        Authorization: `KakaoAK ${process.env.KAKAO_API_KEY}`,
      },
    });
    const address_name =
      addressResponse.data.documents[0].address.region_2depth_name
      +" "+ addressResponse.data.documents[0].address.region_3depth_name
    console.log('주소:', address_name);

    // Spotify API 호출
    const spotifyApiInstance = req.spotifyApi;
    const query = weatherKeywords.join(' ');
    const spotifyResponse = await spotifyApiInstance.searchTracks(query, { limit: 10 });
    console.log('Spotify 검색 결과:', spotifyResponse.body.tracks.items.length);
    // 응답에 weatherCode 포함 // 0109raemi
    res.json({
      weatherCode : weatherCode, // 0113 raemi
      Imagepath: Imagepath, // 0113 raemi
      address: address_name, //0113 raemi
      tracks: spotifyResponse.body.tracks.items,
    });
  } catch (error) {
    console.error('오류 발생:', error.message || error);
    res.status(500).json({ error: 'KMA API 호출 또는 Spotify API 또는 Kakao API 호출 실패' });
  }
});

// 0109raemi 라우터추가
// 사용자 ID 가져오기 & 플레이리스트 생성 & 곡 추가
router.get('/onthehouse',ensureSpotifyToken, async (req, res) => {
  try {
  // Spotify API 호출
  console.log('Spotify API 객체 확인:', req.spotifyApi);
  const spotifyApiInstance = req.spotifyApi;
  
  //Spotify API id가져오기
  const userProfile = await spotifyApiInstance.getMe();
  const userId = userProfile.body.id
  console.log('사용자 id:', userId);

  // 요청쿼리에서 playlistName과 playlistDescription tracks를 가져오기
  const { playlistName, playlistDescription,publicOption, tracks } = req.query;
  console.log('플리이름:', playlistName,'/플리 설명:', playlistDescription
    ,'/공공옵션:', publicOption
    ,'/tracks:', tracks);
  /* {=================나중에 플리이름 중복검사 추가하기=================} */

  if (!playlistName || !playlistDescription || !tracks) {
      return res.status(400).json({ error: '필수 매개변수가 없습니다.' });
  }
  // trackUris를 배열로 복원
  const Tracks = JSON.parse(tracks);
  if (!Array.isArray(Tracks)) {
    return res.status(400).json({ error: 'trackUris가 유효하지 않습니다.' });
  }

  // Spotify API 플레이리스트 생성
  const playlist = await spotifyApiInstance.createPlaylist(userId, {
    name: playlistName,
    description: playlistDescription,
    public: publicOption,
  });
  const playlistId = playlist.body.id;
  console.log('생성된 플레이리스트 ID:', playlistId);

  // Spotify API 플레이리스트에 곡 추가
  const addTracks = await spotifyApiInstance.addTracksToPlaylist(playlistId, Tracks);

    res.json({ message: '플레이리스트 생성 및 곡 추가 완료', addTracks});
  } catch (error) {
    console.error('플레이리스트생성 실패:', error.message);
    res.status(500).json({ error: '사용자 ID 가져오기 및 플레이리스트 생성 실패' });
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
  //console.log(skyValue,rainValue);
  // 0109raemi // 문자반환이 아니라 weathercode반환으로변경(이후 재사용성)
  // 맑음(0), 흐림(1), 비(2), 눈(3)
  if (skyValue == 1 && rainValue == 0) return 0;
  if ((skyValue == 3 || skyValue == 4) && rainValue == 0) return 1;
  if (rainValue == 1 || rainValue ==2 || rainValue == 5) return 2;
  if (rainValue == 6 || rainValue == 7) return 3;
  return -1;
}

// 날씨 설명에 따른 키워드 생성 함수 //0109raemi weathercode 조건절 바꿈
function generateWeatherKeywords(weatherCode) {
  const keywords = [];
  // 맑음(0), 흐림(1), 비(2), 눈(3)
  if (weatherCode === 0) {
    keywords.push('sunny', 'happy', 'energetic','Bright tunes');
  } else if (weatherCode === 1) {
    keywords.push('cloudy', 'calm', 'soft','Chill tunes','Relaxing songs','Soft indie');
  } else if (weatherCode === 2) {
    keywords.push('rainy', 'chill', 'relaxing', 'Lo-fi rain' );
  } else if (weatherCode === 3) {
    keywords.push('snowy', 'winter', 'cozy','Winter beats');
  }
  return keywords;
}

// 0113 raemi
function getWeatherImagepath(weatherCode) {
  let Imagepath = ''
  if (weatherCode === 0) {
    Imagepath = '/image/sunny.png'
  } else if (weatherCode === 1) {
    Imagepath = '/image/cloudy.png'
  } else if (weatherCode === 2) {
    Imagepath = '/image/rainy.png'
  } else if (weatherCode === 3) {
    Imagepath = '/image/snowy.png'
  }
  return Imagepath;
}

module.exports = router;
