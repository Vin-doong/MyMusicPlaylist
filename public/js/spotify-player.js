let player;
let currentDeviceId;
let currentVolume = 0.5; // 초기 볼륨 값 (0.5)

// Spotify Web Playback SDK 초기화
async function initializeSpotifyPlayer() {
  const token = await getSpotifyToken();

  player = new Spotify.Player({
    name: 'Spotify Web Player',
    getOAuthToken: cb => cb(token),
    volume: currentVolume,
  });

  player.addListener('ready', ({ device_id }) => handlePlayerReady(device_id));
  player.addListener('not_ready', ({ device_id }) => console.error(`Player not ready. Device ID: ${device_id}`));
  player.addListener('player_state_changed', updatePlayerState);

  const success = await player.connect();
  if (!success) alert('Spotify Player 연결에 실패했습니다.');
}

// Spotify 토큰 가져오기
async function getSpotifyToken() {
  const response = await fetch('/auth/playback-token');
  const { token } = await response.json();
  return token;
}

// 플레이어 준비 완료 핸들러
async function handlePlayerReady(deviceId) {
  console.log(`Spotify Player 준비 완료. Device ID: ${deviceId}`);
  currentDeviceId = deviceId;
  await activateDevice(deviceId);
  syncVolumeWithUI(currentVolume);
}

// 디바이스 활성화
async function activateDevice(deviceId) {
  const token = await getSpotifyToken();
  try {
    const response = await fetch('https://api.spotify.com/v1/me/player', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ device_ids: [deviceId], play: false }),
    });

    if (!response.ok) throw new Error(`Spotify API 에러: ${await response.json().error.message}`);
    console.log(`디바이스 활성화 완료: ${deviceId}`);
  } catch (error) {
    console.error('디바이스 활성화 실패:', error);
    alert('Spotify 디바이스 활성화에 실패했습니다.');
  }
}

// 플레이어 상태 업데이트
function updatePlayerState(state) {
  if (!state) return;
  const track = state.track_window.current_track;
  document.getElementById('track-name').textContent = track.name || '재생 중인 곡 없음';
  document.getElementById('track-artist').textContent = (track.artists || []).map(artist => artist.name).join(', ');
  syncVolumeWithUI(currentVolume);
}



// 특정 곡 재생
async function playTrack(spotifyUri) {
  if (!currentDeviceId) return alert('Spotify Player가 준비되지 않았습니다.');
  const token = await getSpotifyToken();

  try {
    const isPlaylist = spotifyUri.startsWith('spotify:playlist:');
    const requestBody = isPlaylist ? { context_uri: spotifyUri } : { uris: [spotifyUri] };

    const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${currentDeviceId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) throw new Error(`Spotify API 에러: ${await response.json().error.message}`);
    console.log(`곡 재생 중: ${spotifyUri}`);
  } catch (error) {
    console.error('곡 재생 실패:', error);
    alert('곡 재생에 실패했습니다.');
  }
}

// 볼륨 조절
function adjustVolume(volume) {
  if (!player) return alert('Spotify Player가 준비되지 않았습니다.');
  currentVolume = volume;
  player.setVolume(volume).catch(error => {
    console.error('볼륨 조절 실패:', error);
    alert('볼륨 조절에 실패했습니다.');
  });
  syncVolumeWithUI(volume);
}
////////////////////////////////////////////////////////////////
document.addEventListener("DOMContentLoaded", () => {
  const playBtn = document.getElementById("play-btn");
  const pauseBtn = document.getElementById("pause-btn");
  const progressBar = document.getElementById("progress-bar");
  const powerLight = document.querySelector(".power-light");
  const leftReel = document.getElementById("reel-left");
  const rightReel = document.getElementById("reel-right");


  let isPlaying = false;
  let currentTime = 0;
  const totalDuration = 210;

  // Play Button
  playBtn.addEventListener("click", () => {
    isPlaying = true;
    playBtn.style.display = "none";
    pauseBtn.style.display = "inline-block";
    powerLight.classList.add("on");
    startProgress();
    leftReel.classList.add("spinning");
    rightReel.classList.add("spinning");
  });

  // Pause Button
  pauseBtn.addEventListener("click", () => {
    isPlaying = false;
    playBtn.style.display = "inline-block";
    pauseBtn.style.display = "none";
    powerLight.classList.remove("on");
    leftReel.classList.remove("spinning");
    rightReel.classList.remove("spinning");
  });

  // Progress Bar Logic
  function startProgress() {
    const interval = setInterval(() => {
      if (!isPlaying || currentTime >= totalDuration) {
        clearInterval(interval);
      } else {
        currentTime++;
        updateProgressBar();
      }
    }, 1000);
  }

  function updateProgressBar() {
    const progressPercentage = (currentTime / totalDuration) * 100;
    progressBar.style.width = `${progressPercentage}%`;
  }
});

////////////////////////////////////////////////////////////////


// 재생/일시정지/곡 이동 컨트롤러
function controlPlayback(action) {
  if (!player) return alert('Spotify Player가 준비되지 않았습니다.');
  const actions = {
    resume: () => player.resume(),
    pause: () => player.pause(),
    next: () => player.nextTrack(),
    previous: () => player.previousTrack(),
  };
  actions[action]?.().catch(error => {
    console.error(`${action} 실패:`, error);
    alert(`${action}에 실패했습니다.`);
  });
  //0117
  if (action === 'previous' || action === 'next' || action === 'resume') {
    // Footer UI를 재생 상태로 업데이트
    updateFooterPlayButton();
  }
}
//0117
// Footer Play 버튼 상태 업데이트 함수
function updateFooterPlayButton() {
  const playButton = document.getElementById('play-btn');
  const pauseButton = document.getElementById('pause-btn');
  const powerLight = document.querySelector('.power-light');
  const leftReel = document.getElementById('reel-left');
  const rightReel = document.getElementById('reel-right');

  if (playButton && pauseButton) {
    playButton.style.display = 'none'; // Play 버튼 숨기기
    pauseButton.style.display = 'inline-block'; // Pause 버튼 표시
  }

  // 애니메이션 및 UI 업데이트
  if (powerLight) powerLight.classList.add('on');
  if (leftReel) leftReel.classList.add('spinning');
  if (rightReel) rightReel.classList.add('spinning');
}
//

// 재생목록 가져오기
async function fetchPlaylists() {
  const token = await getSpotifyToken();

  try {
    const response = await fetch('https://api.spotify.com/v1/me/playlists', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error(`Spotify API 에러: ${await response.json().error.message}`);
    const data = await response.json();
    updatePlaylistUI(data.items);
  } catch (error) {
    console.error('재생목록 가져오기 실패:', error);
    alert('재생목록 가져오기에 실패했습니다.');
  }
}

// 재생목록 UI 업데이트
function updatePlaylistUI(playlists) {
  const playlistsContainer = document.getElementById('playlists');
  playlistsContainer.innerHTML = '';
  playlists.forEach(({ name, uri }) => {
    const listItem = document.createElement('li');
    listItem.className = 'list-group-item d-flex justify-content-between align-items-center';
    listItem.textContent = name;

    const playButton = document.createElement('button');
    playButton.textContent = '재생';
    playButton.className = 'btn btn-primary btn-sm';
        // 재생 버튼 클릭 이벤트
        playButton.addEventListener('click', () => {
          playTrack(uri); // Spotify 트랙 재생
          triggerFooterPlayButton(); // Footer Play 버튼 트리거
        });

    listItem.appendChild(playButton);
    playlistsContainer.appendChild(listItem);
  });
}
//0117
function triggerFooterPlayButton() {
  const footerPlayButton = document.getElementById('play-btn');

  if (footerPlayButton) {
    footerPlayButton.click(); // Footer의 Play 버튼 클릭 이벤트 트리거
  }
}
document.getElementById('prev-btn')?.addEventListener('click', () => {
  controlPlayback('previous'); // 이전 곡으로 이동
  triggerFooterPlayButton();   // Footer Play 버튼 트리거
});

document.getElementById('next-btn')?.addEventListener('click', () => {
  controlPlayback('next');     // 다음 곡으로 이동
  triggerFooterPlayButton();   // Footer Play 버튼 트리거
});

function handlePlayButtonClick(event) {
  const uri = event.target.getAttribute('data-uri');
  if (!uri) return;

  // Spotify 트랙 재생
  playTrack(uri);

  // Footer Play 버튼 상태 업데이트
  updateFooterPlayButton();
}
// 모든 Play 버튼에 이벤트 리스너 추가
function initializePlayButtonListeners() {
  document.querySelectorAll('.play-btn').forEach(button => {
    button.addEventListener('click', handlePlayButtonClick);
  });
}
//

// 이벤트 리스너 연결
document.getElementById('volume-slider')?.addEventListener('input', event => adjustVolume(event.target.value / 100));
document.getElementById('fetch-playlists-btn')?.addEventListener('click', fetchPlaylists);
document.getElementById('play-btn')?.addEventListener('click', () => controlPlayback('resume'));
document.getElementById('pause-btn')?.addEventListener('click', () => controlPlayback('pause'));
document.getElementById('prev-btn')?.addEventListener('click', () => controlPlayback('previous'));
document.getElementById('next-btn')?.addEventListener('click', () => controlPlayback('next'));

// 초기화
window.onSpotifyWebPlaybackSDKReady = initializeSpotifyPlayer;

/* // 플레이어 상태 변경 시 호출
function updatePlayerState(state) {
  if (!state) return;

  const isPlaying = !state.paused;
  const leftReel = document.getElementById("reel-left");
  const rightReel = document.getElementById("reel-right");

  if (isPlaying) {
    leftReel.classList.add("spinning");
    rightReel.classList.add("spinning");
  } else {
    leftReel.classList.remove("spinning");
    rightReel.classList.remove("spinning");
  }
}
// Spotify Web Playback SDK 초기화 시 연결
player.addListener("player_state_changed", updatePlayerState); */