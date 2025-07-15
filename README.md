# Collaborative Candidate Notes App

A modern, real-time candidate notes and chat app for collaborative hiring teams. Built with React (Vite), Firebase, Tailwind CSS, and ShadCN UI. Features authentication, real-time chat, reactions, threads, media, presence, and a professional, responsive UI.

---

## Features
- 🔒 **Authentication**: Secure login and registration with Firebase Auth
- 🏠 **Dashboard**: Add candidates, view notifications, and open candidate notes
- 💬 **Real-time Chat**: WhatsApp-style chat for each candidate, with reactions, threads, and media
- 🧑‍🤝‍🧑 **Presence**: See who is online in each chat
- 🔍 **Search**: Find messages quickly within candidate notes
- 📱 **Responsive Design**: Works beautifully on mobile, tablet, and desktop
- 🎨 **Modern UI**: Built with Tailwind CSS and ShadCN UI for a professional look

---

## Screenshots

### Login Page
![Login Page](public/screenshots/login.png)

### Register Page
![Register Page](public/screenshots/register.png)

### Dashboard
![Dashboard](public/screenshots/dashboard.png)

### Chat/Notes Page
![Chat/Notes Page](public/screenshots/chat.png)

---

## Tech Stack
- [React (Vite)](https://vitejs.dev/)
- [Firebase (Auth, Firestore, Storage)](https://firebase.google.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [ShadCN UI](https://ui.shadcn.com/)

---

## Getting Started (Local Development)

1. **Clone the repo:**
   ```bash
   git clone https://github.com/your-username/candidate-notes.git
   cd candidate-notes
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Set up Firebase:**
   - Create a Firebase project at https://console.firebase.google.com/
   - Enable Authentication (Email/Password), Firestore, and Storage
   - Get your Firebase config from Project Settings → General → Your apps
   - Create a `.env` file in the root:
     ```env
     VITE_FIREBASE_API_KEY=your_api_key
     VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
     VITE_FIREBASE_PROJECT_ID=your_project_id
     VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
     VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
     VITE_FIREBASE_APP_ID=your_app_id
     ```
4. **Run the app:**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173` (or as shown in your terminal).

---

## Deployment (Vercel)
1. Push your code to GitHub/GitLab/Bitbucket.
2. Go to [vercel.com](https://vercel.com/) and import your repo.
3. Set the same environment variables in Vercel (Project → Settings → Environment Variables).
4. Deploy! Vercel will build and host your app.

---

## Environment Variables
- All Firebase config variables must be prefixed with `VITE_` for Vite to expose them to the frontend.
- **Never commit secrets to public repos.**

---

## Credits
- Built with React (Vite), Firebase, Tailwind CSS, ShadCN UI
- Designed for collaborative hiring teams

---

For questions, issues, or contributions, please open an issue or contact the project maintainer.

---

## License

This project is licensed under the MIT License. © 2024 Navya
