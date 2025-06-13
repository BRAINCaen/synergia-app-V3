
import { punchIn, punchOut } from '../../modules/timetracking/TimetrackingService';
import { useState } from 'react';

const Timetracking = () => {
  const [status, setStatus] = useState<string | null>(null);

  const handlePunchIn = async () => {
    try {
      await punchIn();
      setStatus("Entrée enregistrée !");
    } catch (error) {
      console.error(error);
      setStatus("Erreur lors du pointage d'entrée.");
    }
  };

  const handlePunchOut = async () => {
    try {
      await punchOut();
      setStatus("Sortie enregistrée !");
    } catch (error) {
      console.error(error);
      setStatus("Erreur lors du pointage de sortie.");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-4 border rounded shadow text-center">
      <h2 className="text-xl font-bold mb-4">Pointage</h2>
      <button onClick={handlePunchIn} className="bg-green-600 text-white p-2 rounded w-full mb-2">Entrer</button>
      <button onClick={handlePunchOut} className="bg-red-600 text-white p-2 rounded w-full">Sortir</button>
      {status && <p className="mt-4 text-sm text-gray-600">{status}</p>}
    </div>
  );
};

export default Timetracking;
