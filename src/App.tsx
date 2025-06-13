import React from "react";
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD7uBuAQaOhZ02owkZEuMKC5Vji6PrB2f8",
  authDomain: "synergia-app-f27e7.firebaseapp.com",
  projectId: "synergia-app-f27e7",
  storageBucket: "synergia-app-f27e7.firebasestorage.app",
  messagingSenderId: "201912738922",
  appId: "1:201912738922:web:2fcc1e49293bb632899613",
  measurementId: "G-EGJ79SCMWX"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

function App() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-gray-700">
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center text-blue-700 mb-4">Synergia App V3</h1>
        <p className="text-center">Bienvenue sur votre nouvelle application !</p>
        <p className="text-xs text-gray-400 mt-4">Firebase connecté ✔️</p>
      </div>
    </div>
  );
}

export default App;
