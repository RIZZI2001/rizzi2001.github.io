const column_1 = document.getElementById('column_1');
const column_2 = document.getElementById('column_2');

let column_1_height = 0;
let column_2_height = 0;

fetch('images/drawings/drawings.json')
    .then(response => response.json())
    .then(data => {
        data.forEach(item => {
            const galleryItem = document.createElement('div');
            galleryItem.classList.add('gallery-item');

            const img = document.createElement('img');
            img.src = item.thumb || item.src;
            img.alt = item.name;

            const dateOverlay = document.createElement('div');
            dateOverlay.classList.add('date-overlay');
            dateOverlay.textContent = item.date;
            const nameOverlay = document.createElement('div');
            nameOverlay.classList.add('name-overlay');
            nameOverlay.textContent = item.name;

            galleryItem.setAttribute('data-fullsrc', item.src);

            galleryItem.appendChild(img);
            galleryItem.appendChild(dateOverlay);
            galleryItem.appendChild(nameOverlay);

            img.onload = function() {
                // Append to the correct column
                if (column_1_height <= column_2_height) {
                    column_1.appendChild(galleryItem);
                    column_1_height += img.naturalHeight;
                } else {
                    column_2.appendChild(galleryItem);
                    column_2_height += img.naturalHeight;
                }

                // Attach click listener after image is loaded and appended
                galleryItem.addEventListener('click', () => {
                    console.log('Item clicked:', galleryItem);
                    const imgSrc = galleryItem.getAttribute('data-fullsrc');
                    const name = galleryItem.querySelector('.name-overlay').textContent;
                    const date = galleryItem.querySelector('.date-overlay').textContent;

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
            };

            img.onerror = function() {
                console.error('Image failed to load:', img.src);
            };
        });
    })
    .catch(error => console.error('Error loading the JSON file:', error));