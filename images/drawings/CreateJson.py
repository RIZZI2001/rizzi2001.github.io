import os
import json
from datetime import datetime

# Define the output JSON file
output_file = "drawings.json"

# List to store the drawing details
drawings = []

# Get the current directory
current_directory = os.getcwd()

# Iterate through all files in the directory
for filename in os.listdir(current_directory):
    if filename.endswith(".png"):
        # Construct the relative path to the image
        file_path = f"images/drawings/{filename}"
        
        # Get the file's last modified date
        full_file_path = os.path.join(current_directory, filename)
        last_modified_timestamp = os.path.getmtime(full_file_path)
        last_modified_date = datetime.fromtimestamp(last_modified_timestamp).strftime('%Y-%m-%d')
        
        # Extract the name without the .png extension
        name_without_extension = os.path.splitext(filename)[0]
        
        # Add the file details to the list
        drawings.append({
            "src": file_path,
            "name": name_without_extension,
            "date": last_modified_date
        })

# Sort the drawings by date in descending order
drawings.sort(key=lambda x: x["date"], reverse=True)

# Write the list to the JSON file
with open(output_file, "w") as json_file:
    json.dump(drawings, json_file, indent=4)

print(f"Drawings data has been written to {output_file}")