
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './shared/components/Login';
import Register from './shared/components/Register';

function App() {
  return (
    <BrowserRouter>
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
