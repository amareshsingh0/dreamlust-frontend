import { useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Cloud, Server, Globe, Wifi, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ConnectivityChecker = () => {
  const [backendStatus, setBackendStatus] = useState<'unchecked' | 'online' | 'offline' | 'error'>('unchecked');
  const [supabaseStatus, setSupabaseStatus] = useState<'unchecked' | 'assumed-online' | 'cannot-check'>('unchecked');
  const [checking, setChecking] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  const checkBackend = async () => {
    setChecking(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        credentials: 'include',
        signal: controller.signal,
        cache: 'no-cache',
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        setBackendStatus('online');
      } else {
        setBackendStatus('error');
      }
    } catch (error: any) {
      if (error.name === 'AbortError' || (error.name === 'TypeError' && error.message.includes('fetch'))) {
        setBackendStatus('offline');
      } else {
        setBackendStatus('error');
      }
    } finally {
      setChecking(false);
    }
  };

  const checkSupabase = async () => {
    // We can't directly check Supabase from browser due to CORS,
    // but we can infer from backend status
    if (backendStatus === 'online') {
      setSupabaseStatus('assumed-online');
    } else {
      setSupabaseStatus('cannot-check');
    }
  };

  const checkAll = async () => {
    await checkBackend();
    await checkSupabase();
  };

  interface StatusBadgeProps {
    status: 'online' | 'offline' | 'error' | 'assumed-online' | 'cannot-check' | 'unchecked';
    label: string;
  }

  const StatusBadge = ({ status, label }: StatusBadgeProps) => {
    const configs = {
      online: { bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-800 dark:text-green-300', border: 'border-green-300 dark:border-green-700', icon: CheckCircle },
      offline: { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-800 dark:text-red-300', border: 'border-red-300 dark:border-red-700', icon: XCircle },
      error: { bg: 'bg-orange-100 dark:bg-orange-900/20', text: 'text-orange-800 dark:text-orange-300', border: 'border-orange-300 dark:border-orange-700', icon: AlertCircle },
      'assumed-online': { bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-800 dark:text-blue-300', border: 'border-blue-300 dark:border-blue-700', icon: CheckCircle },
      'cannot-check': { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-800 dark:text-gray-300', border: 'border-gray-300 dark:border-gray-700', icon: AlertCircle },
      unchecked: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', border: 'border-gray-300 dark:border-gray-700', icon: AlertCircle }
    };

    const config = configs[status] || configs.unchecked;
    const Icon = config.icon;

    return (
      <div className={`${config.bg} ${config.text} border ${config.border} rounded-lg p-3 flex items-center gap-2`}>
        <Icon className="w-5 h-5" />
        <span className="font-medium">{label}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 mb-8">
          <div className="text-center mb-6">
            <Wifi className="w-16 h-16 text-indigo-600 dark:text-indigo-400 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-2">
              Local Development Connectivity Checker
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Let's verify what's working and what's not
            </p>
          </div>

          <Button
            onClick={checkAll}
            disabled={checking}
            className="w-full py-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition font-medium disabled:bg-gray-400 disabled:cursor-not-allowed text-lg"
          >
            {checking ? (
              <>
                <RefreshCw className="w-5 h-5 mr-2 animate-spin inline" />
                Checking...
              </>
            ) : (
              <>
                🔍 Run Connectivity Check
              </>
            )}
          </Button>
        </div>

        {/* Your Setup */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-6 flex items-center gap-2">
            <Globe className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Your Current Setup
          </h2>

          <div className="space-y-6">
            {/* Frontend */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <Globe className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-2">Frontend (Your Browser)</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Running at: <code className="bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded">http://localhost:4001</code>
                  </p>
                  <StatusBadge status="online" label="✅ Frontend is Working (you can see this page)" />
                </div>
              </div>
            </div>

            {/* Backend */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                  <Server className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-2">Backend (Local Server)</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Should be at: <code className="bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded">{API_BASE_URL}</code>
                  </p>
                  <StatusBadge 
                    status={backendStatus} 
                    label={
                      backendStatus === 'online' ? '✅ Backend is Running' :
                      backendStatus === 'offline' ? '❌ Backend is NOT Running' :
                      backendStatus === 'error' ? '⚠️ Backend Connection Error' :
                      '⏳ Not Checked Yet'
                    }
                  />
                  
                  {backendStatus === 'offline' && (
                    <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="text-sm font-bold text-red-800 dark:text-red-300 mb-2">🚨 This is the problem!</p>
                      <p className="text-sm text-red-700 dark:text-red-400 mb-3">
                        Your backend server is not running. Start it with:
                      </p>
                      <pre className="bg-gray-900 dark:bg-black text-green-400 p-3 rounded text-sm overflow-x-auto">
                        <code>{`cd C:\\desktop\\dreamlust-project\\backend\n.\\start-server.ps1`}</code>
                      </pre>
                    </div>
                  )}

                  {backendStatus === 'online' && (
                    <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <p className="text-sm text-green-700 dark:text-green-400">
                        ✅ Great! Your backend is responding properly.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Supabase */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <Cloud className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-2">Supabase (Cloud Database)</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    URL: <code className="bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded">aqtovzzjevtfswqraqbl.supabase.co</code>
                  </p>
                  <StatusBadge 
                    status={supabaseStatus} 
                    label={
                      supabaseStatus === 'assumed-online' ? '✅ Supabase Accessible (via backend)' :
                      supabaseStatus === 'cannot-check' ? '⚠️ Cannot check (backend offline)' :
                      '⏳ Not Checked Yet'
                    }
                  />
                  
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      <strong>Note:</strong> Supabase is a cloud service. As long as your backend has the correct DATABASE_URL in .env, it will work from localhost.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* About Cloud Services */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
            ℹ️ About Your Services
          </h2>
          
          <div className="space-y-4">
            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-1">Supabase</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>Purpose:</strong> Cloud PostgreSQL database<br/>
                <strong>Local Development:</strong> ✅ Works perfectly with localhost<br/>
                <strong>Impact:</strong> None - designed to work from anywhere
              </p>
            </div>

            <div className="border-l-4 border-purple-500 pl-4">
              <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-1">Mux.com</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>Purpose:</strong> Video streaming and HLS transcoding<br/>
                <strong>Local Development:</strong> ✅ Not involved in login/authentication<br/>
                <strong>Impact:</strong> None - only used for video playback, not backend connectivity
              </p>
            </div>

            <div className="border-l-4 border-orange-500 pl-4">
              <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-1">Cloudflare</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>Purpose:</strong> CDN and DDoS protection for production<br/>
                <strong>Local Development:</strong> ✅ Not involved - only for deployed sites<br/>
                <strong>Impact:</strong> None for localhost development
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm font-bold text-green-800 dark:text-green-300 mb-2">
              ✅ None of These Services Block Localhost!
            </p>
            <p className="text-sm text-green-700 dark:text-green-400">
              They're all designed to work with local development. The services are accessed via API calls, 
              and they don't care if you're calling from localhost:3001, your production domain, or a local network IP.
            </p>
          </div>
        </div>

        {/* Connection Flow */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
            🔄 How It Should Work
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">1</div>
              <div className="flex-1">
                <p className="font-semibold text-gray-800 dark:text-gray-200">Frontend (Browser)</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">localhost:4001 → Makes API request</p>
              </div>
            </div>

            <div className="ml-6 border-l-2 border-gray-300 dark:border-gray-600 h-8"></div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">2</div>
              <div className="flex-1">
                <p className="font-semibold text-gray-800 dark:text-gray-200">Backend (Express Server)</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">localhost:3001 → Receives request</p>
              </div>
            </div>

            <div className="ml-6 border-l-2 border-gray-300 dark:border-gray-600 h-8"></div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">3</div>
              <div className="flex-1">
                <p className="font-semibold text-gray-800 dark:text-gray-200">Supabase (Cloud Database)</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Cloud → Processes database query</p>
              </div>
            </div>

            <div className="ml-6 border-l-2 border-gray-300 dark:border-gray-600 h-8"></div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold">4</div>
              <div className="flex-1">
                <p className="font-semibold text-gray-800 dark:text-gray-200">Response Back</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Data flows back through backend to frontend</p>
              </div>
            </div>
          </div>

          {backendStatus === 'offline' && (
            <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-300">
                <strong>Currently Broken At:</strong> Step 2 - Backend is not running, so the chain stops here.
              </p>
            </div>
          )}
        </div>

        {/* Next Steps */}
        {backendStatus === 'offline' && (
          <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-red-800 dark:text-red-300 mb-4">
              🚨 Action Required: Start Your Backend
            </h2>
            
            <ol className="space-y-3 text-gray-800 dark:text-gray-200">
              <li className="flex items-start gap-3">
                <span className="font-bold">1.</span>
                <div>
                  <p>Open PowerShell</p>
                  <pre className="bg-gray-900 dark:bg-black text-green-400 p-3 rounded text-sm mt-2 overflow-x-auto">
                    <code>cd C:\desktop\dreamlust-project\backend</code>
                  </pre>
                </div>
              </li>
              
              <li className="flex items-start gap-3">
                <span className="font-bold">2.</span>
                <div>
                  <p>Run the startup script</p>
                  <pre className="bg-gray-900 dark:bg-black text-green-400 p-3 rounded text-sm mt-2 overflow-x-auto">
                    <code>.\start-server.ps1</code>
                  </pre>
                </div>
              </li>
              
              <li className="flex items-start gap-3">
                <span className="font-bold">3.</span>
                <p>Wait for: <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">🚀 Server running on http://localhost:3001</code></p>
              </li>
              
              <li className="flex items-start gap-3">
                <span className="font-bold">4.</span>
                <p>Click "Run Connectivity Check" again above</p>
              </li>

              <li className="flex items-start gap-3">
                <span className="font-bold">5.</span>
                <p>Refresh your login page (Ctrl+Shift+R)</p>
              </li>
            </ol>
          </div>
        )}

        {backendStatus === 'online' && (
          <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-green-800 dark:text-green-300 mb-4">
              ✅ Everything Looks Good!
            </h2>
            
            <p className="text-gray-800 dark:text-gray-200 mb-4">
              Your backend is running and accessible. Now:
            </p>

            <ol className="space-y-2 text-gray-800 dark:text-gray-200">
              <li>1. Go to your login page</li>
              <li>2. Press Ctrl+Shift+R (hard refresh)</li>
              <li>3. Try logging in - it should work now!</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectivityChecker;
