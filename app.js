// MusicFlow - Music Player PWA Application

class MusicPlayer {
    constructor() {
        this.audio = document.getElementById('audio-player');
        this.video = document.getElementById('video-player');
        this.currentTrack = null;
        this.queue = [];
        this.currentQueueIndex = 0;
        this.isPlaying = false;
        this.shuffle = false;
        this.repeat = 'none'; // none, one, all
        this.volume = 0.8;
        this.favorites = [];
        this.playlists = [];
        this.localFiles = [];
        this.currentView = 'home';
        
        // Initialize
        this.init();
    }
    
    init() {
        this.loadData();
        this.bindEvents();
        this.renderContent();
        this.setupPWA();
    }
    
    loadData() {
        // Load from localStorage
        const savedFavorites = localStorage.getItem('musicflow_favorites');
        const savedPlaylists = localStorage.getItem('musicflow_playlists');
        const savedLocalFiles = localStorage.getItem('musicflow_local_files');
        const savedVolume = localStorage.getItem('musicflow_volume');
        const lastTrack = localStorage.getItem('musicflow_last_track');
        
        if (savedFavorites) this.favorites = JSON.parse(savedFavorites);
        if (savedPlaylists) this.playlists = JSON.parse(savedPlaylists);
        if (savedLocalFiles) this.localFiles = JSON.parse(savedLocalFiles);
        if (savedVolume) {
            this.volume = parseFloat(savedVolume);
            this.audio.volume = this.volume;
        }
        if (lastTrack) {
            const track = JSON.parse(lastTrack);
            this.currentTrack = track;
            this.updatePlayerUI(track);
        }
        
        // Set initial volume
        document.getElementById('volume-slider').value = this.volume * 100;
        this.updateVolumeIcon();
    }
    
    saveData() {
        localStorage.setItem('musicflow_favorites', JSON.stringify(this.favorites));
        localStorage.setItem('musicflow_playlists', JSON.stringify(this.playlists));
        localStorage.setItem('musicflow_local_files', JSON.stringify(this.localFiles));
        localStorage.setItem('musicflow_volume', this.volume.toString());
        if (this.currentTrack) {
            localStorage.setItem('musicflow_last_track', JSON.stringify(this.currentTrack));
        }
    }
    
    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const view = item.dataset.view;
                this.navigateTo(view);
            });
        });
        
        // Menu toggle
        document.getElementById('btn-menu-toggle').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('open');
            document.body.classList.toggle('sidebar-collapsed');
        });
        
        // Search
        const searchInput = document.getElementById('search-input');
        const clearSearch = document.getElementById('btn-clear-search');
        
        searchInput.addEventListener('input', (e) => {
            clearSearch.style.display = e.target.value ? 'flex' : 'none';
            if (e.target.value.length > 2) {
                this.search(e.target.value);
            } else if (e.target.value.length === 0) {
                this.navigateTo(this.currentView);
            }
        });
        
        clearSearch.addEventListener('click', () => {
            searchInput.value = '';
            clearSearch.style.display = 'none';
            this.navigateTo(this.currentView);
        });
        
        // Player controls
        document.getElementById('btn-play-pause').addEventListener('click', () => this.togglePlay());
        document.getElementById('btn-prev').addEventListener('click', () => this.prevTrack());
        document.getElementById('btn-next').addEventListener('click', () => this.nextTrack());
        document.getElementById('btn-shuffle').addEventListener('click', () => this.toggleShuffle());
        document.getElementById('btn-repeat').addEventListener('click', () => this.toggleRepeat());
        document.getElementById('btn-volume').addEventListener('click', () => this.toggleMute());
        document.getElementById('volume-slider').addEventListener('input', (e) => this.setVolume(e.target.value / 100));
        document.getElementById('btn-fullscreen').addEventListener('click', () => this.toggleFullscreen());
        document.getElementById('btn-now-playing').addEventListener('click', () => this.toggleQueue());
        
        // Progress bar
        const progressBar = document.getElementById('progress-bar');
        progressBar.addEventListener('click', (e) => this.seekTo(e));
        
        // Like button
        document.getElementById('btn-like-current').addEventListener('click', () => this.toggleFavoriteCurrent());
        
        // Fullscreen player controls
        document.getElementById('btn-minimize').addEventListener('click', () => this.toggleFullscreen());
        document.getElementById('btn-npfs-play-pause').addEventListener('click', () => this.togglePlay());
        document.getElementById('btn-npfs-prev').addEventListener('click', () => this.prevTrack());
        document.getElementById('btn-npfs-next').addEventListener('click', () => this.nextTrack());
        document.getElementById('btn-npfs-shuffle').addEventListener('click', () => this.toggleShuffle());
        document.getElementById('btn-npfs-repeat').addEventListener('click', () => this.toggleRepeat());
        document.getElementById('btn-npfs-like').addEventListener('click', () => this.toggleFavoriteCurrent());
        
        // Audio events
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('ended', () => this.handleTrackEnd());
        this.audio.addEventListener('loadedmetadata', () => this.updateDuration());
        this.audio.addEventListener('play', () => {
            this.isPlaying = true;
            this.updatePlayButton();
        });
        this.audio.addEventListener('pause', () => {
            this.isPlaying = false;
            this.updatePlayButton();
        });
        
        // Queue
        document.getElementById('btn-close-queue').addEventListener('click', () => this.toggleQueue());
        document.querySelectorAll('.queue-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.queue-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
            });
        });
        
        // Create playlist
        document.getElementById('btn-new-playlist').addEventListener('click', () => this.openModal());
        document.getElementById('create-playlist-card').addEventListener('click', () => this.openModal());
        document.getElementById('btn-close-modal').addEventListener('click', () => this.closeModal());
        document.getElementById('btn-cancel-playlist').addEventListener('click', () => this.closeModal());
        document.getElementById('btn-create-playlist').addEventListener('click', () => this.createPlaylist());
        
        // Local files
        const uploadZone = document.getElementById('upload-zone');
        const fileInput = document.getElementById('file-input');
        
        uploadZone.addEventListener('click', () => fileInput.click());
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('dragover');
        });
        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('dragover');
        });
        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('dragover');
            this.handleFiles(e.dataTransfer.files);
        });
        fileInput.addEventListener('change', (e) => this.handleFiles(e.target.files));
        
        // Library tabs
        document.querySelectorAll('.lib-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.lib-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.renderLibrary(tab.dataset.tab);
            });
        });
        
        // Categories
        document.querySelectorAll('.category-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
            });
        });
        
        // Close modal on overlay click
        document.querySelector('.modal-overlay').addEventListener('click', () => this.closeModal());
    }
    
    navigateTo(view) {
        // Update nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.view === view) {
                item.classList.add('active');
            }
        });
        
        // Update views
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        const targetView = document.getElementById(`${view}-view`);
        if (targetView) {
            targetView.classList.add('active');
            this.currentView = view;
        }
        
        // Close sidebar on mobile
        document.getElementById('sidebar').classList.remove('open');
        
        // Render content based on view
        this.renderContent(view);
    }
    
    renderContent(view) {
        switch(view) {
            case 'home':
                this.renderHome();
                break;
            case 'playlists':
                this.renderPlaylists();
                break;
            case 'favorites':
                this.renderFavorites();
                break;
            case 'library':
                this.renderLibrary('songs');
                break;
            case 'local':
                this.renderLocalFiles();
                break;
        }
    }
    
    renderHome() {
        // Recently played
        const recentContainer = document.getElementById('recently-played');
        recentContainer.innerHTML = this.generateSongCards(this.getSampleSongs().slice(0, 8));
        
        // Top artists
        const artistsContainer = document.getElementById('top-artists');
        artistsContainer.innerHTML = this.generateArtistCards(this.getSampleArtists());
        
        // Made for you
        const madeForYou = document.getElementById('made-for-you');
        madeForYou.innerHTML = this.generatePlaylistCards(this.getSamplePlaylists().slice(0, 5));
        
        // Trending
        const trending = document.getElementById('trending-songs');
        trending.innerHTML = this.generateSongCards(this.getSampleSongs().slice(0, 6));
    }
    
    renderPlaylists() {
        const grid = document.getElementById('playlists-grid');
        const allPlaylists = [
            ...this.playlists,
            { id: 'liked', name: 'Liked Songs', cover: null, type: 'system' },
            ...this.getSamplePlaylists()
        ];
        grid.innerHTML = this.generatePlaylistCards(allPlaylists, true);
        
        // Update sidebar playlists
        this.updateSidebarPlaylists();
    }
    
    renderFavorites() {
        const tbody = document.getElementById('favorites-tbody');
        const songs = this.favorites.length > 0 ? this.favorites : this.getSampleSongs().slice(0, 10);
        tbody.innerHTML = this.generateSongTableRows(songs);
    }
    
    renderLibrary(tab) {
        const content = document.getElementById('library-content');
        switch(tab) {
            case 'songs':
                content.innerHTML = `
                    <div class="songs-table-container">
                        <table class="songs-table">
                            <thead>
                                <tr>
                                    <th class="th-number">#</th>
                                    <th class="th-title">Title</th>
                                    <th class="th-artist">Artist</th>
                                    <th class="th-album">Album</th>
                                    <th class="th-duration"><span class="material-icons">schedule</span></th>
                                    <th class="th-actions"></th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.generateSongTableRows(this.getSampleSongs())}
                            </tbody>
                        </table>
                    </div>
                `;
                break;
            case 'albums':
                content.innerHTML = `<div class="albums-grid">${this.generateAlbumCards(this.getSampleAlbums())}</div>`;
                break;
            case 'artists':
                content.innerHTML = `<div class="artists-grid">${this.generateArtistCards(this.getSampleArtists(), true)}</div>`;
                break;
            case 'playlists':
                content.innerHTML = `<div class="playlists-grid">${this.generatePlaylistCards(this.playlists)}</div>`;
                break;
        }
    }
    
    renderLocalFiles() {
        const list = document.getElementById('local-files-list');
        if (this.localFiles.length === 0) {
            list.innerHTML = '<p style="text-align: center; color: var(--text-tertiary); padding: 32px;">No local files added yet. Upload some music to get started!</p>';
        } else {
            list.innerHTML = this.localFiles.map(file => `
                <div class="local-file-item" data-file="${file.name}">
                    <div class="local-file-icon">
                        <span class="material-icons">music_note</span>
                    </div>
                    <div class="local-file-info">
                        <div class="local-file-name">${file.name}</div>
                        <div class="local-file-size">${this.formatFileSize(file.size)}</div>
                    </div>
                    <button class="btn-icon btn-play-local" data-url="${file.url}">
                        <span class="material-icons">play_arrow</span>
                    </button>
                </div>
            `).join('');
            
            list.querySelectorAll('.btn-play-local').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.playLocalFile(btn.dataset.url);
                });
            });
        }
    }
    
    generateSongCards(songs) {
        return songs.map(song => `
            <div class="song-card" data-id="${song.id}">
                <div class="song-card-cover">
                    <img src="${song.cover}" alt="${song.title}">
                    <div class="play-overlay">
                        <span class="material-icons">play_arrow</span>
                    </div>
                </div>
                <div class="song-card-title">${song.title}</div>
                <div class="song-card-artist">${song.artist}</div>
            </div>
        `).join('');
    }
    
    generateArtistCards(artists, square = false) {
        return artists.map(artist => `
            <div class="artist-card">
                <div class="artist-card-cover">
                    <img src="${artist.image}" alt="${artist.name}">
                </div>
                <div class="artist-card-name">${artist.name}</div>
                <div class="artist-card-type">${artist.type || 'Artist'}</div>
            </div>
        `).join('');
    }
    
    generatePlaylistCards(playlists, includeCreate = false) {
        let html = '';
        if (includeCreate) {
            html += `
                <div class="create-playlist-card" id="create-playlist-card">
                    <span class="material-icons">add</span>
                    <span>Create New Playlist</span>
                </div>
            `;
        }
        html += playlists.map(playlist => `
            <div class="playlist-card" data-id="${playlist.id}">
                <div class="playlist-card-cover">
                    <img src="${playlist.cover || 'https://via.placeholder.com/200x200/6366f1/fff?text=♪'}" alt="${playlist.name}">
                    <div class="play-overlay">
                        <span class="material-icons">play_arrow</span>
                    </div>
                </div>
                <div class="playlist-card-title">${playlist.name}</div>
                <div class="playlist-card-description">${playlist.description || 'Playlist'}</div>
            </div>
        `).join('');
        return html;
    }
    
    generateAlbumCards(albums) {
        return albums.map(album => `
            <div class="album-card">
                <div class="album-card-cover">
                    <img src="${album.cover}" alt="${album.title}">
                    <div class="play-overlay">
                        <span class="material-icons">play_arrow</span>
                    </div>
                </div>
                <div class="album-card-title">${album.title}</div>
                <div class="album-card-artist">${album.artist}</div>
            </div>
        `).join('');
    }
    
    generateSongTableRows(songs) {
        return songs.map((song, index) => `
            <tr data-id="${song.id}">
                <td>
                    <button class="btn-icon table-play-btn" data-id="${song.id}">
                        <span class="material-icons">play_arrow</span>
                    </button>
                </td>
                <td>
                    <div class="table-song-info">
                        <div class="table-song-cover">
                            <img src="${song.cover}" alt="${song.title}">
                        </div>
                        <div class="table-song-details">
                            <span class="table-song-title">${song.title}</span>
                            <span class="table-song-artist">${song.artist}</span>
                        </div>
                    </div>
                </td>
                <td>${song.artist}</td>
                <td>${song.album || '-'}</td>
                <td class="table-duration">${song.duration || '3:45'}</td>
                <td class="table-actions">
                    <button class="btn-icon btn-like-song ${this.isFavorite(song.id) ? 'active' : ''}" data-id="${song.id}">
                        <span class="material-icons">${this.isFavorite(song.id) ? 'favorite' : 'favorite_border'}</span>
                    </button>
                </td>
            </tr>
        `).join('');
    }
    
    updateSidebarPlaylists() {
        const container = document.getElementById('sidebar-playlists');
        const playlists = this.playlists.slice(0, 5);
        container.innerHTML = playlists.map(p => `
            <div class="playlist-list-item" data-id="${p.id}">
                <span class="material-icons">playlist_play</span>
                <span>${p.name}</span>
            </div>
        `).join('') + (playlists.length === 0 ? '<p style="padding: 12px 16px; color: var(--text-tertiary); font-size: 0.85rem;">No playlists yet</p>' : '');
    }
    
    // Playback controls
    playTrack(track) {
        this.currentTrack = track;
        this.audio.src = track.url || track.previewUrl;
        this.audio.play();
        this.updatePlayerUI(track);
        this.addToQueue(track);
        this.saveData();
    }
    
    playLocalFile(url) {
        const track = {
            id: 'local-' + Date.now(),
            title: url.split('/').pop(),
            artist: 'Local File',
            album: 'Local Files',
            cover: 'https://via.placeholder.com/56x56/6366f1/fff?text=♪',
            url: url,
            duration: 'Unknown'
        };
        this.playTrack(track);
    }
    
    togglePlay() {
        if (this.currentTrack) {
            if (this.isPlaying) {
                this.audio.pause();
            } else {
                this.audio.play();
            }
        } else {
            // Play first song from queue or sample
            const songs = this.getSampleSongs();
            if (songs.length > 0) {
                this.playTrack(songs[0]);
            }
        }
    }
    
    prevTrack() {
        if (this.currentQueueIndex > 0) {
            this.currentQueueIndex--;
            this.playTrack(this.queue[this.currentQueueIndex]);
        } else if (this.queue.length > 0) {
            this.playTrack(this.queue[this.queue.length - 1]);
        }
    }
    
    nextTrack() {
        if (this.shuffle) {
            this.currentQueueIndex = Math.floor(Math.random() * this.queue.length);
        } else if (this.currentQueueIndex < this.queue.length - 1) {
            this.currentQueueIndex++;
        } else {
            this.currentQueueIndex = 0;
        }
        if (this.queue.length > 0) {
            this.playTrack(this.queue[this.currentQueueIndex]);
        }
    }
    
    handleTrackEnd() {
        if (this.repeat === 'one') {
            this.audio.currentTime = 0;
            this.audio.play();
        } else if (this.currentQueueIndex < this.queue.length - 1 || this.repeat === 'all') {
            this.nextTrack();
        }
    }
    
    toggleShuffle() {
        this.shuffle = !this.shuffle;
        document.getElementById('btn-shuffle').classList.toggle('active', this.shuffle);
        document.getElementById('btn-npfs-shuffle').classList.toggle('active', this.shuffle);
    }
    
    toggleRepeat() {
        const modes = ['none', 'one', 'all'];
        const currentIndex = modes.indexOf(this.repeat);
        this.repeat = modes[(currentIndex + 1) % modes.length];
        
        const btn = document.getElementById('btn-repeat');
        const btnNpfs = document.getElementById('btn-npfs-repeat');
        
        btn.classList.toggle('active', this.repeat !== 'none');
        btnNpfs.classList.toggle('active', this.repeat !== 'none');
        
        if (this.repeat === 'one') {
            btn.querySelector('.material-icons').textContent = 'repeat_one';
            btnNpfs.querySelector('.material-icons').textContent = 'repeat_one';
        } else {
            btn.querySelector('.material-icons').textContent = 'repeat';
            btnNpfs.querySelector('.material-icons').textContent = 'repeat';
        }
    }
    
    setVolume(value) {
        this.volume = value;
        this.audio.volume = value;
        document.getElementById('volume-slider').value = value * 100;
        this.updateVolumeIcon();
        this.saveData();
    }
    
    toggleMute() {
        if (this.audio.volume > 0) {
            this.audio.volume = 0;
            document.getElementById('volume-slider').value = 0;
        } else {
            this.audio.volume = this.volume || 0.8;
            document.getElementById('volume-slider').value = this.volume * 100;
        }
        this.updateVolumeIcon();
    }
    
    updateVolumeIcon() {
        const icon = document.getElementById('volume-icon');
        if (this.audio.volume === 0) {
            icon.textContent = 'volume_off';
        } else if (this.audio.volume < 0.5) {
            icon.textContent = 'volume_down';
        } else {
            icon.textContent = 'volume_up';
        }
    }
    
    seekTo(e) {
        const bar = e.currentTarget;
        const rect = bar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        this.audio.currentTime = percent * this.audio.duration;
    }
    
    updateProgress() {
        const percent = (this.audio.currentTime / this.audio.duration) * 100;
        document.getElementById('progress-fill').style.width = `${percent}%`;
        document.getElementById('npfs-progress-fill').style.width = `${percent}%`;
        document.getElementById('current-time').textContent = this.formatTime(this.audio.currentTime);
        document.getElementById('npfs-current-time').textContent = this.formatTime(this.audio.currentTime);
    }
    
    updateDuration() {
        document.getElementById('total-duration').textContent = this.formatTime(this.audio.duration);
        document.getElementById('npfs-total-duration').textContent = this.formatTime(this.audio.duration);
    }
    
    updatePlayerUI(track) {
        // Update now playing
        document.getElementById('now-playing-title').textContent = track.title;
        document.getElementById('now-playing-artist').textContent = track.artist;
        document.getElementById('now-playing-cover').src = track.cover;
        
        // Update fullscreen player
        document.getElementById('npfs-track-title').textContent = track.title;
        document.getElementById('npfs-track-artist').textContent = track.artist;
        document.getElementById('npfs-track-album').textContent = track.album || 'Unknown Album';
        document.getElementById('npfs-cover').src = track.cover;
        document.getElementById('npfs-background').style.backgroundImage = `url(${track.cover})`;
        
        // Update like button
        const isFav = this.isFavorite(track.id);
        document.getElementById('btn-like-current').classList.toggle('active', isFav);
        document.getElementById('btn-like-current').querySelector('.material-icons').textContent = isFav ? 'favorite' : 'favorite_border';
        document.getElementById('npfs-like-icon').textContent = isFav ? 'favorite' : 'favorite_border';
        document.getElementById('npfs-like').classList.toggle('active', isFav);
    }
    
    updatePlayButton() {
        const icon = document.getElementById('play-icon');
        const npfsIcon = document.getElementById('npfs-play-icon');
        
        if (this.isPlaying) {
            icon.textContent = 'pause';
            npfsIcon.textContent = 'pause';
        } else {
            icon.textContent = 'play_arrow';
            npfsIcon.textContent = 'play_arrow';
        }
    }
    
    toggleFullscreen() {
        const fullscreen = document.getElementById('now-playing-fullscreen');
        fullscreen.classList.toggle('active');
    }
    
    toggleQueue() {
        const queue = document.getElementById('queue-panel');
        queue.classList.toggle('active');
        this.renderQueue();
    }
    
    renderQueue() {
        const list = document.getElementById('queue-list');
        const upcoming = this.queue.slice(this.currentQueueIndex + 1);
        const recentlyPlayed = this.queue.slice(0, this.currentQueueIndex + 1).reverse();
        
        list.innerHTML = [...upcoming, ...recentlyPlayed].map((track, index) => `
            <div class="queue-item ${index === 0 ? 'playing' : ''}" data-id="${track.id}">
                <div class="queue-item-cover">
                    <img src="${track.cover}" alt="${track.title}">
                </div>
                <div class="queue-item-info">
                    <div class="queue-item-title">${track.title}</div>
                    <div class="queue-item-artist">${track.artist}</div>
                </div>
            </div>
        `).join('');
    }
    
    addToQueue(track) {
        // Don't add if already in queue
        if (!this.queue.find(t => t.id === track.id)) {
            this.queue.push(track);
            this.currentQueueIndex = this.queue.length - 1;
        }
    }
    
    // Favorites
    toggleFavorite(songId) {
        const index = this.favorites.findIndex(f => f.id === songId);
        if (index > -1) {
            this.favorites.splice(index, 1);
        } else {
            const song = this.getSampleSongs().find(s => s.id === songId);
            if (song) {
                this.favorites.push(song);
            }
        }
        this.saveData();
        this.showToast(this.favorites.find(f => f.id === songId) ? 'Added to favorites' : 'Removed from favorites');
    }
    
    toggleFavoriteCurrent() {
        if (this.currentTrack) {
            this.toggleFavorite(this.currentTrack.id);
            this.updatePlayerUI(this.currentTrack);
        }
    }
    
    isFavorite(songId) {
        return this.favorites.some(f => f.id === songId);
    }
    
    // Playlists
    openModal() {
        document.getElementById('create-playlist-modal').classList.add('active');
    }
    
    closeModal() {
        document.getElementById('create-playlist-modal').classList.remove('active');
        document.getElementById('playlist-name').value = '';
        document.getElementById('playlist-description').value = '';
    }
    
    createPlaylist() {
        const name = document.getElementById('playlist-name').value.trim();
        const description = document.getElementById('playlist-description').value.trim();
        
        if (!name) {
            this.showToast('Please enter a playlist name', 'error');
            return;
        }
        
        const playlist = {
            id: 'playlist-' + Date.now(),
            name,
            description,
            cover: `https://via.placeholder.com/200x200/${Math.floor(Math.random()*16777215).toString(16)}/fff?text=${name.charAt(0)}`,
            songs: [],
            createdAt: new Date().toISOString()
        };
        
        this.playlists.push(playlist);
        this.saveData();
        this.renderPlaylists();
        this.closeModal();
        this.showToast(`Playlist "${name}" created`);
    }
    
    // Local files
    handleFiles(files) {
        Array.from(files).forEach(file => {
            if (file.type.startsWith('audio/')) {
                const url = URL.createObjectURL(file);
                this.localFiles.push({
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    url: url,
                    addedAt: new Date().toISOString()
                });
            }
        });
        
        this.saveData();
        this.renderLocalFiles();
        this.showToast(`${files.length} file(s) added`);
    }
    
    // Search
    search(query) {
        const results = {
            songs: this.getSampleSongs().filter(s => 
                s.title.toLowerCase().includes(query.toLowerCase()) ||
                s.artist.toLowerCase().includes(query.toLowerCase())
            ),
            artists: this.getSampleArtists().filter(a => 
                a.name.toLowerCase().includes(query.toLowerCase())
            ),
            albums: this.getSampleAlbums().filter(a => 
                a.title.toLowerCase().includes(query.toLowerCase()) ||
                a.artist.toLowerCase().includes(query.toLowerCase())
            ),
            playlists: this.getSamplePlaylists().filter(p => 
                p.name.toLowerCase().includes(query.toLowerCase())
            )
        };
        
        this.renderSearchResults(query, results);
    }
    
    renderSearchResults(query, results) {
        // Navigate to search view
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById('search-view').classList.add('active');
        document.getElementById('search-query-display').textContent = `Results for "${query}"`;
        
        const container = document.getElementById('search-results');
        let html = '';
        
        if (results.songs.length > 0) {
            html += `
                <div class="search-section">
                    <h3 class="search-section-title">Songs</h3>
                    <div class="songs-table-container">
                        <table class="songs-table">
                            <thead>
                                <tr>
                                    <th class="th-number">#</th>
                                    <th class="th-title">Title</th>
                                    <th class="th-artist">Artist</th>
                                    <th class="th-album">Album</th>
                                    <th class="th-duration"><span class="material-icons">schedule</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.generateSongTableRows(results.songs)}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }
        
        if (results.artists.length > 0) {
            html += `
                <div class="search-section">
                    <h3 class="search-section-title">Artists</h3>
                    <div class="horizontal-scroll">
                        ${this.generateArtistCards(results.artists)}
                    </div>
                </div>
            `;
        }
        
        if (results.albums.length > 0) {
            html += `
                <div class="search-section">
                    <h3 class="search-section-title">Albums</h3>
                    <div class="horizontal-scroll">
                        ${results.albums.map(a => `
                            <div class="album-card">
                                <div class="album-card-cover">
                                    <img src="${a.cover}" alt="${a.title}">
                                    <div class="play-overlay">
                                        <span class="material-icons">play_arrow</span>
                                    </div>
                                </div>
                                <div class="album-card-title">${a.title}</div>
                                <div class="album-card-artist">${a.artist}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        if (results.playlists.length > 0) {
            html += `
                <div class="search-section">
                    <h3 class="search-section-title">Playlists</h3>
                    <div class="horizontal-scroll">
                        ${this.generatePlaylistCards(results.playlists)}
                    </div>
                </div>
            `;
        }
        
        if (html === '') {
            html = '<p style="text-align: center; color: var(--text-tertiary); padding: 48px;">No results found</p>';
        }
        
        container.innerHTML = html;
    }
    
    // Sample data
    getSampleSongs() {
        return [
            { id: '1', title: 'Blinding Lights', artist: 'The Weeknd', album: 'After Hours', duration: '3:20', cover: 'https://via.placeholder.com/56x56/ff6b6b/fff?text=♫', previewUrl: '' },
            { id: '2', title: 'Levitating', artist: 'Dua Lipa', album: 'Future Nostalgia', duration: '3:23', cover: 'https://via.placeholder.com/56x56/845ec2/fff?text=♫', previewUrl: '' },
            { id: '3', title: 'Save Your Tears', artist: 'The Weeknd', album: 'After Hours', duration: '3:35', cover: 'https://via.placeholder.com/56x56/ff6b6b/fff?text=♫', previewUrl: '' },
            { id: '4', title: 'Peaches', artist: 'Justin Bieber', album: 'Justice', duration: '3:18', cover: 'https://via.placeholder.com/56x56/ffc75f/fff?text=♫', previewUrl: '' },
            { id: '5', title: 'Montero', artist: 'Lil Nas X', album: 'Montero', duration: '2:17', cover: 'https://via.placeholder.com/56x56/f9f871/fff?text=♫', previewUrl: '' },
            { id: '6', title: 'Stay', artist: 'The Kid LAROI', album: 'F*CK LOVE 3', duration: '2:21', cover: 'https://via.placeholder.com/56x56/00c9a7/fff?text=♫', previewUrl: '' },
            { id: '7', title: 'Good 4 U', artist: 'Olivia Rodrigo', album: 'SOUR', duration: '2:58', cover: 'https://via.placeholder.com/56x56/6a0572/fff?text=♫', previewUrl: '' },
            { id: '8', title: 'Industry Baby', artist: 'Lil Nas X', album: 'Montero', duration: '3:32', cover: 'https://via.placeholder.com/56x56/f9f871/fff?text=♫', previewUrl: '' },
            { id: '9', title: 'Heat Waves', artist: 'Glass Animals', album: 'Dreamland', duration: '3:58', cover: 'https://via.placeholder.com/56x56/0081af/fff?text=♫', previewUrl: '' },
            { id: '10', title: 'Bad Habits', artist: 'Ed Sheeran', album: '=', duration: '3:50', cover: 'https://via.placeholder.com/56x56/ff9671/fff?text=♫', previewUrl: '' }
        ];
    }
    
    getSampleArtists() {
        return [
            { name: 'The Weeknd', image: 'https://via.placeholder.com/160x160/ff6b6b/fff?text=TW', type: 'Artist' },
            { name: 'Dua Lipa', image: 'https://via.placeholder.com/160x160/845ec2/fff?text=DL', type: 'Artist' },
            { name: 'Ed Sheeran', image: 'https://via.placeholder.com/160x160/ff9671/fff?text=ES', type: 'Artist' },
            { name: 'Billie Eilish', image: 'https://via.placeholder.com/160x160/00d2d3/fff?text=BE', type: 'Artist' },
            { name: 'Drake', image: 'https://via.placeholder.com/160x160/54a0ff/fff?text=DR', type: 'Artist' },
            { name: 'Ariana Grande', image: 'https://via.placeholder.com/160x160/5f27cd/fff?text=AG', type: 'Artist' }
        ];
    }
    
    getSampleAlbums() {
        return [
            { title: 'After Hours', artist: 'The Weeknd', cover: 'https://via.placeholder.com/180x180/ff6b6b/fff?text=AH' },
            { title: 'Future Nostalgia', artist: 'Dua Lipa', cover: 'https://via.placeholder.com/180x180/845ec2/fff?text=FN' },
            { title: 'Justice', artist: 'Justin Bieber', cover: 'https://via.placeholder.com/180x180/ffc75f/fff?text=JU' },
            { title: 'SOUR', artist: 'Olivia Rodrigo', cover: 'https://via.placeholder.com/180x180/6a0572/fff?text=SO' },
            { title: '=', artist: 'Ed Sheeran', cover: 'https://via.placeholder.com/180x180/ff9671/fff?text=EQ' },
            { title: 'Montero', artist: 'Lil Nas X', cover: 'https://via.placeholder.com/180x180/f9f871/fff?text=MO' }
        ];
    }
    
    getSamplePlaylists() {
        return [
            { id: 'p1', name: 'Top Hits 2024', description: 'The hottest tracks right now', cover: 'https://via.placeholder.com/200x200/6366f1/fff?text=🔥' },
            { id: 'p2', name: 'Chill Vibes', description: 'Relax and unwind', cover: 'https://via.placeholder.com/200x200/10b981/fff?text=🌊' },
            { id: 'p3', name: 'Workout Mix', description: 'Power through your workout', cover: 'https://via.placeholder.com/200x200/ef4444/fff?text=💪' },
            { id: 'p4', name: 'Focus Flow', description: 'Perfect for studying', cover: 'https://via.placeholder.com/200x200/8b5cf6/fff?text=🎯' },
            { id: 'p5', name: 'Party Playlist', description: 'Get the party started', cover: 'https://via.placeholder.com/200x200/f59e0b/fff?text=🎉' },
            { id: 'p6', name: 'Indie Gems', description: 'Discover new indie artists', cover: 'https://via.placeholder.com/200x200/ec4899/fff?text=💎' }
        ];
    }
    
    // Utility methods
    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    showToast(message, type = 'success') {
        const container = document.querySelector('.toast-container') || this.createToastContainer();
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="material-icons">${type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info'}</span>
            <span class="toast-message">${message}</span>
            <button class="btn-icon toast-close">
                <span class="material-icons">close</span>
            </button>
        `;
        container.appendChild(toast);
        
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.remove();
        });
        
        setTimeout(() => toast.remove(), 3000);
    }
    
    createToastContainer() {
        const container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
        return container;
    }
    
    // PWA Setup
    setupPWA() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js')
                .then(reg => console.log('Service Worker registered'))
                .catch(err => console.log('Service Worker registration failed:', err));
        }
        
        // Install prompt
        let deferredPrompt;
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            this.showInstallPrompt();
        });
        
        window.addEventListener('appinstalled', () => {
            deferredPrompt = null;
            this.showToast('App installed successfully!');
        });
    }
    
    showInstallPrompt() {
        const prompt = document.createElement('div');
        prompt.className = 'install-prompt active';
        prompt.innerHTML = `
            <div class="install-prompt-text">Install MusicFlow for the best experience!</div>
            <div class="install-prompt-actions">
                <button class="btn-secondary" id="btn-dismiss-install">Later</button>
                <button class="btn-primary" id="btn-accept-install">Install</button>
            </div>
        `;
        document.body.appendChild(prompt);
        
        prompt.querySelector('#btn-dismiss-install').addEventListener('click', () => {
            prompt.classList.remove('active');
            setTimeout(() => prompt.remove(), 300);
        });
        
        prompt.querySelector('#btn-accept-install').addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`User choice: ${outcome}`);
                prompt.classList.remove('active');
                setTimeout(() => prompt.remove(), 300);
            }
        });
    }
}

// Initialize the music player when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.musicPlayer = new MusicPlayer();
});
