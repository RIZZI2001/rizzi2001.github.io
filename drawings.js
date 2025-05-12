const column_1 = document.getElementById('column_1');
const column_2 = document.getElementById('column_2');

let nextColumn = column_1;

function setupGalleryItemClick() {
    const galleryItems = document.querySelectorAll('.gallery-item');
    galleryItems.forEach(item => {
        item.addEventListener('click', () => {
            const imgSrc = item.querySelector('img').src;
            const name = item.querySelector('.name-overlay').textContent;
            const date = item.querySelector('.date-overlay').textContent;

            // Create the modal
            const modal = document.createElement('div');
            modal.classList.add('modal');

            const modalImg = document.createElement('img');
            modalImg.src = imgSrc;
            modalImg.alt = 'Large view';

            // Create a container for the name and date
            const modalDetails = document.createElement('div');
            modalDetails.classList.add('modal-details');

            modalDetails.textContent = `${name} - ${date}`;

            // Close button
            const closeButton = document.createElement('span');
            closeButton.classList.add('close-button');
            closeButton.textContent = '×';
            closeButton.addEventListener('click', () => {
                modal.remove();
            });

            modal.appendChild(modalImg);
            modal.appendChild(modalDetails);
            modal.appendChild(closeButton);
            document.body.appendChild(modal);
        });
    });
}

fetch('images/drawings/drawings.json')
    .then(response => response.json())
    .then(data => {
        data.forEach(item => {
            const galleryItem = document.createElement('div');
            galleryItem.classList.add('gallery-item');

            const img = document.createElement('img');
            img.src = item.src;
            img.alt = item.name;

            const dateOverlay = document.createElement('div');
            dateOverlay.classList.add('date-overlay');
            dateOverlay.textContent = item.date;
            const nameOverlay = document.createElement('div');
            nameOverlay.classList.add('name-overlay');
            nameOverlay.textContent = item.name;

            galleryItem.appendChild(img);
            galleryItem.appendChild(dateOverlay);
            galleryItem.appendChild(nameOverlay);
            nextColumn.appendChild(galleryItem);

            // Alternate between columns
            if (nextColumn === column_1) {
                nextColumn = column_2;
            } else {
                nextColumn = column_1;
            }
        });
        setupGalleryItemClick();
    })
    .catch(error => console.error('Error loading the JSON file:', error));