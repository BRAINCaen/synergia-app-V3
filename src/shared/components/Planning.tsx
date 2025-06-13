
import { useEffect, useState } from 'react';
import { getShifts, addShift, deleteShift } from '../../modules/planning/PlanningService';

const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];
const timeSlots = ["Matin", "Après-midi", "Soir"];

const Planning = () => {
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadShifts = async () => {
    setLoading(true);
    const data = await getShifts();
    setShifts(data);
    setLoading(false);
  };

  useEffect(() => {
    loadShifts();
  }, []);

  const handleAdd = async (day: string, time: string) => {
    await addShift(day, time);
    loadShifts();
  };

  const handleDelete = async (id: string) => {
    await deleteShift(id);
    loadShifts();
  };

  return (
    <div className="max-w-5xl mx-auto mt-10 p-4">
      <h2 className="text-xl font-bold mb-4 text-center">Planning Hebdomadaire</h2>
      <div className="grid grid-cols-6 gap-4 text-center">
        <div></div>
        {days.map(day => (
          <div key={day} className="font-semibold">{day}</div>
        ))}
        {timeSlots.map(time => (
          <>
            <div className="font-semibold">{time}</div>
            {days.map(day => {
              const slots = shifts.filter(s => s.day === day && s.time === time);
              return (
                <div key={day + time} className="border p-2 min-h-[4rem]">
                  {slots.map(slot => (
                    <div key={slot.id} className="bg-blue-100 p-1 rounded mb-1 flex justify-between">
                      <span>{slot.userId.slice(0, 6)}</span>
                      <button onClick={() => handleDelete(slot.id)} className="text-red-600 ml-2">✕</button>
                    </div>
                  ))}
                  <button onClick={() => handleAdd(day, time)} className="text-sm text-green-600 mt-1">+ Ajouter</button>
                </div>
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
};

export default Planning;
