# AI Interview Preparation Agent

Beginner-friendly full stack application for practicing interviews with an AI interviewer.

## Tech Stack

- React + Vite
- Tailwind CSS
- Node.js + Express
- MongoDB + Mongoose
- OpenAI API

## How It Works

1. A user signs up or logs in from the React frontend.
2. The frontend stores the JWT token and calls the Express REST APIs with axios.
3. The user chooses an interview category and starts a session.
4. The backend stores chat messages in MongoDB and asks OpenAI for the next interviewer reply.
5. The chat history stays saved so the user can continue later.

## Setup

1. Copy `server/.env.example` to `server/.env` and fill in your values.
2. Copy `client/.env.example` to `client/.env` if you want a custom API URL.
3. Run `npm install` from the project root.
4. Run `npm run dev` to start the backend and frontend together.

## Important Files

- `server/src/server.js` starts the Express app and connects to MongoDB.
- `server/src/app.js` registers middleware and API routes.
- `server/src/routes/authRoutes.js` handles signup and login.
- `server/src/routes/chatRoutes.js` creates interview sessions and sends messages.
- `server/src/services/openaiService.js` talks to OpenAI and also provides a mock fallback when no key is set.
- `client/src/App.jsx` contains the auth screen, interview dashboard, and chat interface.
- `client/src/api/http.js` sets up axios and adds the token automatically.
- `client/src/index.css` loads Tailwind and the app font.

## Current Status

- Backend scaffolded first
- REST APIs for auth and chat included
- MongoDB models added
- OpenAI service wrapper added with a mock fallback when no API key is set
- Frontend scaffolded with Tailwind and axios
- Responsive chat UI added
# gan-stability-and-image-translation
Exploring Generative AI with GANs for image generation, colorization, and domain translation.
