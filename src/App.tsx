import React from "react";
import Login from "./shared/components/Login";

function App() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-gray-700">
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center text-blue-700 mb-4">
          Synergia App V3
        </h1>
        <p className="text-center">Bienvenue sur votre nouvelle application !</p>
        <Login />
        <pre style={{ color: "#222", background: "#eee", padding: 8, borderRadius: 4, fontSize: 12 }}>
          {JSON.stringify(import.meta.env, null, 2)}
        </pre>
      </div>
    </div>
  );
}

export default App;
