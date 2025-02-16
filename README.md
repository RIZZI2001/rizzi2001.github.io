# PeerJS Chat Application

This is a simple chat application built using PeerJS that allows two clients to communicate with each other in real-time.

## Project Structure

```
peerjs-chat-app
├── src
│   ├── index.html       # HTML structure for the chat application
│   ├── app.js           # Main logic for the chat application
│   └── styles.css       # Styles for the chat application
├── package.json         # npm configuration file
└── README.md            # Project documentation
```

## Getting Started

To set up and run the chat application, follow these steps:

1. **Clone the repository**:
   ```
   git clone <repository-url>
   cd peerjs-chat-app
   ```

2. **Install dependencies**:
   ```
   npm install
   ```

3. **Run the application**:
   You can use a simple HTTP server to serve the files. For example, you can use `http-server`:
   ```
   npx http-server src
   ```

4. **Open the application**:
   Open two browser windows and navigate to the server address (e.g., `http://localhost:8080`). You will be able to communicate between the two clients.

## Features

- Real-time messaging between two clients.
- Simple and clean user interface.
- Built using PeerJS for peer-to-peer communication.

## License

This project is licensed under the MIT License.