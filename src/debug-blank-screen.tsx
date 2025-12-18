/**
 * Debug component to help identify blank screen issues
 * Add this temporarily to see what's happening
 */

import { useEffect } from 'react';

export function DebugBlankScreen() {
  useEffect(() => {
    console.log('🔍 Debug: Component mounted');
    console.log('🔍 Debug: Root element exists:', !!document.getElementById('root'));
    console.log('🔍 Debug: React app should be rendering...');
    
    // Check for common issues
    const root = document.getElementById('root');
    if (root) {
      console.log('🔍 Debug: Root element found');
      console.log('🔍 Debug: Root children:', root.children.length);
    } else {
      console.error('❌ Debug: Root element NOT found!');
    }
    
    // Check for CSS
    const stylesheets = Array.from(document.styleSheets);
    console.log('🔍 Debug: Stylesheets loaded:', stylesheets.length);
    
    // Check for JavaScript errors
    const errors: Error[] = [];
    const originalError = console.error;
    console.error = (...args) => {
      errors.push(new Error(args.join(' ')));
      originalError.apply(console, args);
    };
    
    return () => {
      console.error = originalError;
      if (errors.length > 0) {
        console.warn('🔍 Debug: Errors detected during mount:', errors);
      }
    };
  }, []);
  
  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      background: 'red', 
      color: 'white', 
      padding: '10px',
      zIndex: 9999,
      fontSize: '12px'
    }}>
      🔍 DEBUG MODE: If you see this, React is working but something else is wrong
    </div>
  );
}

