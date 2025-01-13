let player;
let currentDeviceId;
let currentVolume = 0.5; // 초기 볼륨 값 (0.5)

// Spotify Web Playback SDK 초기화
async function initializeSpotifyPlayer() {
  const token = await fetch('/auth/playback-token')
    .then(res => res.json())
    .then(data => data.token);

  player = new Spotify.Player({
    name: 'Spotify Web Player',
    getOAuthToken: cb => cb(token),
    volume: currentVolume, // 초기 볼륨
  });

  player.addListener('ready', ({ device_id }) => {
    if (device_id) {
      console.log('Spotify Player 준비 완료. Device ID:', device_id);
      currentDeviceId = device_id;

      // 디바이스 활성화
      activateDevice(device_id);

      // 슬라이더와 아이콘 초기화
      syncVolumeWithUI(currentVolume);
    }
  });

  player.addListener('not_ready', ({ device_id }) => {
    console.error('Spotify Player가 준비되지 않았습니다. Device ID:', device_id);
  });

  player.addListener('player_state_changed', state => {
    if (state) {
      const track = state.track_window.current_track;
      document.getElementById('track-name').textContent = track.name;
      document.getElementById('track-artist').textContent = track.artists.map(artist => artist.name).join(', ');

      // 슬라이더와 아이콘 동기화
      syncVolumeWithUI(currentVolume);
    }
  });

  const success = await player.connect();
  if (!success) {
    console.error('Spotify Player 연결 실패');
    alert('Spotify Player 연결에 실패했습니다.');
  }
}

// 디바이스 활성화
async function activateDevice(deviceId) {
  const token = await fetch('/auth/playback-token')
    .then(res => res.json())
    .then(data => data.token);

  try {
    const response = await fetch('https://api.spotify.com/v1/me/player', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        device_ids: [deviceId],
        play: false, // 처음 활성화 시 재생하지 않음
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('디바이스 활성화 실패:', errorData);
      throw new Error(`Spotify API 에러: ${errorData.error.message}`);
    }

    console.log(`디바이스 활성화 완료: ${deviceId}`);
  } catch (error) {
    console.error('디바이스 활성화 실패:', error);
    alert('Spotify 디바이스 활성화에 실패했습니다.');
  }
}

// 볼륨 동기화
function syncVolumeWithUI(volume) {
  const volumeSlider = document.getElementById('volume-slider');
  const volumeLabel = document.getElementById('volume-label');
  const volumePercentage = Math.round(volume * 100);

  // 슬라이더 값 및 배경 업데이트
  if (volumeSlider) {
    volumeSlider.value = volumePercentage;
    volumeSlider.style.background = `linear-gradient(to right, #0d6efd ${volumePercentage}%, #ddd ${volumePercentage}%)`;
  }

  // 볼륨 아이콘 업데이트
  if (volumeLabel) {
    if (volumePercentage === 0) {
      volumeLabel.textContent = '🔇'; // 음소거
    } else if (volumePercentage <= 50) {
      volumeLabel.textContent = '🔉'; // 낮은 볼륨
    } else {
      volumeLabel.textContent = '🔊'; // 높은 볼륨
    }
  }
}

// 볼륨 조절
function adjustVolume(volume) {
  if (!player) {
    alert('Spotify Player가 준비되지 않았습니다.');
    return;
  }

  currentVolume = volume; // 현재 볼륨 상태 업데이트
  player.setVolume(volume).catch(error => {
    console.error('볼륨 조절 실패:', error);
    alert('볼륨 조절에 실패했습니다.');
  });

  // 슬라이더와 아이콘 동기화
  syncVolumeWithUI(volume);
}

// 슬라이더 이벤트 리스너 추가
document.getElementById('volume-slider')?.addEventListener('input', event => {
  const volume = event.target.value / 100; // 슬라이더 값을 0~1로 변환
  adjustVolume(volume);
});

// 기존 곡 재생, 재생목록 등의 함수는 그대로 유지


// 특정 곡 재생
async function playTrack(spotifyUri) {
  if (!currentDeviceId) {
    alert('Spotify Player가 준비되지 않았습니다. 잠시 후 다시 시도해주세요.');
    return;
  }

  const token = await fetch('/auth/playback-token')
    .then(res => res.json())
    .then(data => data.token);

  const isPlaylist = spotifyUri.startsWith('spotify:playlist:');

  try {
    const requestBody = isPlaylist
      ? { context_uri: spotifyUri }
      : { uris: [spotifyUri] };

    const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${currentDeviceId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Spotify API 에러: ${errorData.error.message}`);
    }

    console.log(`곡 재생 중: ${spotifyUri}`);
  } catch (error) {
    console.error('곡 재생 실패:', error);
    alert('곡 재생에 실패했습니다. 다시 시도해주세요.');
  }
}

// 재생
function resumePlayback() {
  player.resume().catch(error => {
    console.error('재생 실패:', error);
    alert('재생에 실패했습니다.');
  });
}

// 일시정지
function pausePlayback() {
  player.pause().catch(error => {
    console.error('일시정지 실패:', error);
    alert('일시정지에 실패했습니다.');
  });
}

// 이전 곡
function previousTrack() {
  player.previousTrack().catch(error => {
    console.error('이전 곡 실패:', error);
    alert('이전 곡으로 이동에 실패했습니다.');
  });
}

// 다음 곡
function nextTrack() {
  player.nextTrack().catch(error => {
    console.error('다음 곡 실패:', error);
    alert('다음 곡으로 이동에 실패했습니다.');
  });
}

// 재생목록 가져오기
async function fetchPlaylists() {
  const token = await fetch('/auth/playback-token')
    .then(res => res.json())
    .then(data => data.token);

  try {
    const response = await fetch('https://api.spotify.com/v1/me/playlists', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Spotify API 에러: ${errorData.error.message}`);
    }

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

  playlists.forEach(playlist => {
    const listItem = document.createElement('li');
    listItem.className = 'list-group-item d-flex justify-content-between align-items-center';
    listItem.textContent = playlist.name;

    const playButton = document.createElement('button');
    playButton.textContent = '재생';
    playButton.className = 'btn btn-primary btn-sm';
    playButton.addEventListener('click', () => playTrack(playlist.uri));

    listItem.appendChild(playButton);
    playlistsContainer.appendChild(listItem);
  });
}

// 이벤트 리스너 연결
document.getElementById('play-track-btn')?.addEventListener('click', () => {
  const trackUri = document.getElementById('track-uri')?.value.trim();
  if (trackUri) playTrack(trackUri);
});

document.getElementById('fetch-playlists-btn')?.addEventListener('click', fetchPlaylists);
document.getElementById('play-btn')?.addEventListener('click', resumePlayback);
document.getElementById('pause-btn')?.addEventListener('click', pausePlayback);
document.getElementById('prev-btn')?.addEventListener('click', previousTrack);
document.getElementById('next-btn')?.addEventListener('click', nextTrack);

//초기화
window.onSpotifyWebPlaybackSDKReady = async () => {
  await initializeSpotifyPlayer();
};
