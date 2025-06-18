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

import Login from './shared/components/Login';

function App() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-gray-700">
      <div className="flex flex-col gap-8 items-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <h1 className="text-3xl font-bold text-blue-700 mb-4">Synergia App V3</h1>
          <p>Bienvenue sur votre nouvelle application !</p>
          <p className="mt-2 text-green-600 text-sm">Firebase connecté ✔️</p>
        </div>
        <Login />
      </div>
    </div>
  );
}

export default App;
