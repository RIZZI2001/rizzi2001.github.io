import os
import json
from datetime import datetime
from PIL import Image


# List to store the drawing details
drawings = []

# Get the current directory
dir_path = "images/drawings/"

current_directory = os.path.join(os.getcwd(), dir_path)

output_file = os.path.join(dir_path, "drawings.json")

# Iterate through all files in the directory
for filename in os.listdir(current_directory):
    if filename.endswith(".png"):
        # Construct the relative path to the image
        file_path = os.path.join("images/drawings", filename)
        
        # Get the file's last modified date
        full_file_path = os.path.join(current_directory, filename)
        last_modified_timestamp = os.path.getmtime(full_file_path)
        last_modified_date = datetime.fromtimestamp(last_modified_timestamp).strftime('%Y-%m-%d')
        
        # Extract the name without the .png extension
        name_without_extension = os.path.splitext(filename)[0]

        # Create a thumbnail of the image
        image = Image.open(full_file_path)
        aspect_ratio = image.width / image.height
        size = 500
        thumbnail_size = (size, int(size / aspect_ratio))
        image.thumbnail(thumbnail_size)
        thumbnail_path = os.path.join(dir_path, "thumbnails", filename)
        image.save(thumbnail_path)
        print(f"Thumbnail created for {filename} at {thumbnail_path}")
        
        # Add the file details to the list
        drawings.append({
            "src": file_path,
            "thumb": thumbnail_path,
            "name": name_without_extension,
            "date": last_modified_date
        })

# Sort the drawings by date in descending order
drawings.sort(key=lambda x: x["date"], reverse=True)

# Write the list to the JSON file
with open(output_file, "w") as json_file:
    json.dump(drawings, json_file, indent=4)

print(f"Drawings data has been written to {output_file}")