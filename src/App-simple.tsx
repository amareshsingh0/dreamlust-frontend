/**
 * Simple App component for testing
 * Use this if the main App.tsx has issues
 */

import { BrowserRouter, Routes, Route } from "react-router-dom";

const SimpleApp = () => {
  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial', 
      background: '#1a1a1a', 
      color: '#fff',
      minHeight: '100vh'
    }}>
      <h1>✅ React App is Working!</h1>
      <p>If you see this, React is rendering correctly.</p>
      <p>The blank screen issue is likely in one of the components.</p>
      
      <BrowserRouter>
        <Routes>
          <Route path="/" element={
            <div>
              <h2>Home Page</h2>
              <p>App is working!</p>
            </div>
          } />
        </Routes>
      </BrowserRouter>
    </div>
  );
};

export default SimpleApp;

