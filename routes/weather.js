const express = require('express');
const router = express.Router();
const axios = require('axios');
const { ensureSpotifyToken } = require('../middleware/spotifyToken');

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;

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

    // OpenWeather API 호출
    const openWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}`;
    const openWeatherResponse = await axios.get(openWeatherUrl);
    const Id = openWeatherResponse.data.weather[0].id;
    console.log('OpenWeather 날씨Id:', Id);
    // OpemWeather 날씨 데이터 처리
    const OpenweatherCode = processOpenWeatherData(Id);
    console.log('날씨 코드:', OpenweatherCode);
    const OpenweatherKeywords = generateWeatherKeywords(OpenweatherCode);
    console.log('날씨 키워드:', OpenweatherKeywords);
    if (!OpenweatherKeywords.length) {
      return res.status(400).json({ error: '적합한 날씨 키워드를 생성할 수 없습니다.' });
    }

    // 0113 raemi 기능추가(화면관련)
    const Imagepath = getWeatherImagepath(OpenweatherCode)
    console.log("이미지 경로: "+ Imagepath);
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
    const query = OpenweatherKeywords.join(' ');
    const spotifyResponse = await spotifyApiInstance.searchTracks(query, { limit: 10 });
    console.log('Spotify 검색 결과:', spotifyResponse.body.tracks.items.length);
    // 응답에 weatherCode 포함 // 0109raemi
    res.json({
      weatherCode : OpenweatherCode, // 0113 raemi
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

// OpemWeather 날씨 데이터를 처리하여 날씨 코드 생성
function processOpenWeatherData(Id) {
  // 맑음(0), 흐림(1), 비(2), 눈(3)
  // 안개(4), 연기,먼지(5), 모래(6), 번개,토네이도(7)
  // console.log("프로세스로 들어온 날씨 코드: "+Id);
  if (Id == 800) return 0;
  else if (800<Id) return 1;
  else if ((Id>=300&&Id<400) || (Id>=500&&Id<600) || Id==771) return 2;
  else if (Id >= 600 && Id < 700) return 3;
  else if(Id==701 || Id==721 || Id==741) return 4;
  else if(Id==711 || Id==761 || Id==762) return 5;
  else if(Id==731 || Id==751) return 6;
  else if( (Id>=200&& Id<300) || Id==781) return 7;
  else return -1;
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
  } else if (weatherCode === 4) {
    keywords.push('haze', 'foggy', 'fog','Foggy');
  } else if (weatherCode === 5) {
    keywords.push('dust', 'dusty', 'dusty','Dusty');
  } else if (weatherCode === 6) { //모래쿼리
    keywords.push('sandy', 'hot', 'desert','Desert');
  } else if (weatherCode === 7) { 
    keywords.push('storm', 'stormy', 'storm','Stormy');
  }
  return keywords;
}

// 0113 raemi
function getWeatherImagepath(weatherCode) {
  let Imagepath = ''
  // 1~3 사이의 랜덤 숫자를 생성
  const randomNum = Math.floor(Math.random() * 3) + 1;
  if (weatherCode === 0) {
    Imagepath = `/image/weather/sunny${randomNum}.png`;
  } else if (weatherCode === 1) {
    Imagepath = `/image/weather/cloudy${randomNum}.png`
  } else if (weatherCode === 2) {
    Imagepath = `/image/weather/rainy${randomNum}.png`
  } else if (weatherCode === 3) {
    Imagepath = `/image/weather/snowy${randomNum}.png`
  } else if (weatherCode === 4) {
    Imagepath = `/image/weather/haze${randomNum}.png`
  } else if (weatherCode === 5) {
    Imagepath = `/image/weather/dust${randomNum}.png`
  } else if (weatherCode === 6) {
    Imagepath = `/image/weather/sandy${randomNum}.png`
  } else if (weatherCode === 7) {
    Imagepath = `/image/weather/storm${randomNum}.png`
  }
  return Imagepath;
}

module.exports = router;
