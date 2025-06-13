
import { useState } from 'react';
import { register } from '../../modules/auth/AuthService';
import { useNavigate } from 'react-router-dom';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register(email, password);
      navigate('/dashboard');
    } catch (error) {
      alert("Erreur lors de l'inscription");
      console.error(error);
    }
  };

  return (
    <form onSubmit={handleRegister} className="max-w-md mx-auto mt-10 p-4 border rounded shadow">
      <h2 className="text-xl font-bold mb-4">Inscription</h2>
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full mb-2 p-2 border rounded" />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mot de passe" className="w-full mb-2 p-2 border rounded" />
      <button type="submit" className="w-full bg-green-600 text-white p-2 rounded">S&apos;inscrire</button>
    </form>
  );
};

export default Register;
