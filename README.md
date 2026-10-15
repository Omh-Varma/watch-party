# SyncStream 🎬

SyncStream is a real-time watch party application built with React, TypeScript, Tailwind CSS, and Supabase. It allows users to watch synchronized video streams together, communicate via real-time group chat, participate in live polls, and manage shared media queues.

## 🔗 Live Demo
- **Experience SyncStream live:** [SyncStream Watch Party](https://syncstream-watch-par-u1cs.bolt.host)

## 🚀 Key Features

- **Real-Time Video Synchronization:** Robust playback sync supporting play, pause, seek, and automatic drift correction, paired with strict host-only controls, a manual "Resync" button, and dual-mode support for YouTube and HTML5 streams.
- **Room Security & Host Controls:** Optional password-protected rooms upon creation, along with host management tools to transfer ownership, manage participants, or kick disruptive users in real time.
- **Shared Video Queue:** Add multiple videos to a playlist queue so content auto-plays sequentially for everyone in the room.
- **Interactive Chat & Polls:** Real-time messaging with custom sender names and timestamps, alongside dynamic group polls with live vote tracking.
- **Live YouTube Search:** Search and load YouTube videos instantly via the built-in "Discover" tab.
- **Toast Notifications & Reconnection Alerts:** Clean status alerts for user activity and real-time connection status updates.

## 🛠️ Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS, Lucide Icons
- **Real-Time Database & Backend:** Supabase
- **Hosting:** Static Cloud Deployment

## 📦 Local Setup & Installation

To run this project locally on your machine:

1. **Clone the repository:**
   ```bash
git clone https://github.com/Omh-Varma/watch-party.git
cd watch-party && npm install && npm run dev
