let player;
let currentDeviceId;

// Spotify Web Playback SDK 초기화
async function initializeSpotifyPlayer() {
  const token = await fetch('/auth/playback-token')
    .then(res => res.json())
    .then(data => data.token);

  player = new Spotify.Player({
    name: 'Spotify Web Player',
    getOAuthToken: cb => cb(token),
    volume: 0.8,
  });

  player.addListener('ready', ({ device_id }) => {
    if (device_id) {
      console.log('Spotify Player 준비 완료. Device ID:', device_id);
      currentDeviceId = device_id;

      // 디바이스 활성화
      activateDevice(device_id);
    } else {
      console.error('Device ID가 설정되지 않았습니다.');
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

// 특정 곡 재생
async function playTrack(spotifyUri) {
  if (!currentDeviceId) {
    alert('Spotify Player가 준비되지 않았습니다. 잠시 후 다시 시도해주세요.');
    return;
  }

  const token = await fetch('/auth/playback-token')
    .then(res => res.json())
    .then(data => data.token);

  const isPlaylist = spotifyUri.startsWith('spotify:playlist:'); // URI가 플레이리스트인지 확인

  try {
    const requestBody = isPlaylist
      ? { context_uri: spotifyUri } // 플레이리스트 재생
      : { uris: [spotifyUri] };    // 개별 트랙 재생

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

window.onSpotifyWebPlaybackSDKReady = async () => {
  await initializeSpotifyPlayer();
};
