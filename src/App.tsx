export default App;
import React from "react";
// NE PAS réimporter initializeApp ni refaire une config ici !

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
