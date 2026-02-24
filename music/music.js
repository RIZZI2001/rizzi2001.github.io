// Load music metadata and populate the music container
async function loadMusic() {
    try {
        const response = await fetch('music.json');
        
        if (!response.ok) {
            throw new Error(`Failed to fetch music.json: ${response.status}`);
        }
        
        const musicFiles = await response.json();

        const container = document.querySelector('.music-container');

        musicFiles.forEach((file, index) => {
            // Create a wrapper div for each music item
            const musicItem = document.createElement('div');
            musicItem.className = 'music-item';

            // Create a date label
            const dateLabel = document.createElement('p');
            dateLabel.className = 'music-date';
            dateLabel.textContent = file.date;

            // Create an audio player
            const audio = document.createElement('audio');
            audio.controls = true;
            audio.className = 'music-player';

            // Create a source element for the audio file
            const source = document.createElement('source');
            source.src = encodeURIComponent(file.src);
            source.type = 'audio/mpeg';
            
            // Log when the source fails to load
            source.addEventListener('error', (e) => {
                console.error(`Failed to load: ${file.src} (encoded: ${encodeURIComponent(file.src)})`, e);
            });

            audio.appendChild(source);

            // Append elements to the music item
            musicItem.appendChild(dateLabel);
            musicItem.appendChild(audio);

            // Append music item to the container
            container.appendChild(musicItem);
        });

    } catch (error) {
        console.error('Error loading music:', error);
    }
}

// Load music when the page loads
document.addEventListener('DOMContentLoaded', loadMusic);
