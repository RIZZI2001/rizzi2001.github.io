import os
import json
from datetime import datetime

# List to store the music details
music_files = []

# Get the current directory
dir_path = "music/"
current_directory = os.path.join(os.getcwd(), dir_path)
output_file = os.path.join(dir_path, "music.json")

# Iterate through all files in the directory
for filename in os.listdir(current_directory):
    if filename.endswith(".mp3"):
        # Just use the filename (HTML and MP3s are in same directory)
        file_path = filename
        
        # Get the file's last modified date
        full_file_path = os.path.join(current_directory, filename)
        last_modified_timestamp = os.path.getmtime(full_file_path)
        last_modified_date = datetime.fromtimestamp(last_modified_timestamp).strftime('%Y-%m-%d')

        # Add the file details to the list
        music_files.append({
            "src": file_path,
            "date": last_modified_date
        })

# Sort the music files by date in descending order
music_files.sort(key=lambda x: x["date"], reverse=True)

# Write to JSON file
with open(output_file, 'w') as f:
    json.dump(music_files, f, indent=2)

print(f"Music metadata saved to {output_file}")
print(f"Total files: {len(music_files)}")
