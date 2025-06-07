# Cogneez Notespace

A minimalist, offline-first note-taking application with Markdown support, built with React, Vite, TipTap editor, and PouchDB/CouchDB for data synchronization.

## Features

- Offline-first architecture using PouchDB
- Cloud synchronization with CouchDB
- Rich text editor with Markdown support
- Command menu (press `\` to activate)
- Dark theme UI
- Progressive Web App (PWA) support

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- CouchDB (optional, for sync functionality)

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/cogneez-notespace.git
cd cogneez-notespace
```

2. Install dependencies
```bash
npm install
```

3. Create a `.env` file based on `.env.example`
```bash
cp .env.example .env
```

4. Edit the `.env` file with your CouchDB credentials

5. Start the development server
```bash
npm run dev
```

## CouchDB Setup

### Local Development

1. Install CouchDB from [https://couchdb.apache.org/](https://couchdb.apache.org/)
2. Create an admin user during installation
3. Access the CouchDB dashboard at `http://localhost:5984/_utils`
4. Create a database named `cogneez_notes`
5. Enable CORS in the CouchDB configuration:
   - Go to Configuration > CORS
   - Enable CORS for all domains or specify your app's domain

### Production

For production, you can use:
- Self-hosted CouchDB on your server
- IBM Cloudant (CouchDB as a service)
- Apache CouchDB on AWS or other cloud providers

## Environment Variables

```
# CouchDB Configuration
VITE_COUCHDB_URL=http://localhost:5984
VITE_COUCHDB_USERNAME=admin
VITE_COUCHDB_PASSWORD=password
VITE_COUCHDB_DATABASE=cogneez_notes

# Sync Configuration
VITE_SYNC_ENABLED=true
VITE_SYNC_INTERVAL=30000  # 30 seconds
```

## Architecture

The application uses:
- PouchDB for local storage with offline support
- CouchDB for remote synchronization
- React for the UI
- TipTap for the rich text editor
- Vite for fast development and optimized builds

## Deployment

Build the application for production:

```bash
npm run build
```

The built files will be in the `dist` directory, ready to be deployed to any static hosting service.
