
import { useEffect, useState } from 'react';
import { getFirestore, collection, query, orderBy, getDocs } from 'firebase/firestore';

const TimetrackingAdmin = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecords = async () => {
      setLoading(true);
      const db = getFirestore();
      const q = query(collection(db, 'timetracking'), orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecords(data);
      setLoading(false);
    };

    fetchRecords();
  }, []);

  return (
    <div className="max-w-4xl mx-auto mt-10 p-4 border rounded shadow">
      <h2 className="text-xl font-bold mb-4">Historique de pointage</h2>
      {loading ? (
        <p>Chargement...</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-200">
              <th className="border p-2 text-left">Utilisateur</th>
              <th className="border p-2 text-left">Type</th>
              <th className="border p-2 text-left">Horodatage</th>
            </tr>
          </thead>
          <tbody>
            {records.map(record => (
              <tr key={record.id} className="hover:bg-gray-100">
                <td className="border p-2">{record.userId}</td>
                <td className="border p-2">{record.type}</td>
                <td className="border p-2">{record.timestamp?.toDate().toLocaleString() || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default TimetrackingAdmin;
