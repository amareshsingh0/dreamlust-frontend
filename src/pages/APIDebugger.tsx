import { useState } from 'react';
import { AlertCircle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';

interface EndpointTest {
  endpoint: string;
  url: string;
  method: string;
  status: number | null;
  error: string | null;
  response: unknown;
}

interface TestResults {
  serverReachable: boolean;
  endpoints: EndpointTest[];
  timestamp: string;
  serverError?: string;
  generalError?: string;
}

const APIDebugger = () => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<TestResults | null>(null);
  const [baseUrl, setBaseUrl] = useState('http://localhost:3001');

  const testEndpoint = async () => {
    setTesting(true);
    const testResults: TestResults = {
      serverReachable: false,
      endpoints: [],
      timestamp: new Date().toISOString(),
    };

    try {
      // Test 1: Check if server is reachable
      try {
        const healthCheck = await fetch(`${baseUrl}/health`, {
          method: 'GET',
        });
        testResults.serverReachable = healthCheck.ok;
      } catch (e: unknown) {
        testResults.serverReachable = false;
        testResults.serverError = e instanceof Error ? e.message : 'Unknown error';
      }

      // Test 2: Test the failing endpoint
      const creatorsTest: EndpointTest = {
        endpoint: '/api/creators',
        url: `${baseUrl}/api/creators?page=1&limit=20`,
        method: 'GET',
        status: null,
        error: null,
        response: null,
      };

      try {
        const response = await fetch(creatorsTest.url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        creatorsTest.status = response.status;
        
        try {
          const data = await response.json();
          creatorsTest.response = data;
        } catch (jsonError) {
          creatorsTest.response = await response.text();
        }
      } catch (error: unknown) {
        creatorsTest.error = error instanceof Error ? error.message : 'Unknown error';
      }

      (testResults.endpoints as EndpointTest[]).push(creatorsTest);

      // Test 3: Try without query params
      const creatorsNoParamsTest: EndpointTest = {
        endpoint: '/api/creators (no params)',
        url: `${baseUrl}/api/creators`,
        method: 'GET',
        status: null,
        error: null,
        response: null,
      };

      try {
        const response = await fetch(creatorsNoParamsTest.url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        creatorsNoParamsTest.status = response.status;
        
        try {
          const data = await response.json();
          creatorsNoParamsTest.response = data;
        } catch (jsonError) {
          creatorsNoParamsTest.response = await response.text();
        }
      } catch (error: unknown) {
        creatorsNoParamsTest.error = error instanceof Error ? error.message : 'Unknown error';
      }

      (testResults.endpoints as EndpointTest[]).push(creatorsNoParamsTest);

      setResults(testResults);
    } catch (error: unknown) {
      setResults({
        ...testResults,
        generalError: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    setTesting(false);
  };

  const getStatusColor = (status: number | null): string => {
    if (!status) return 'text-gray-500';
    if (status >= 200 && status < 300) return 'text-green-600';
    if (status >= 400 && status < 500) return 'text-yellow-600';
    if (status >= 500) return 'text-red-600';
    return 'text-gray-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8">
          <h1 className="text-3xl font-bold text-white mb-2">API Endpoint Debugger</h1>
          <p className="text-purple-200 mb-6">Debug your /api/creators endpoint 500 error</p>

          <div className="mb-6">
            <label className="block text-sm font-medium text-purple-200 mb-2">
              API Base URL
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="http://localhost:3001"
            />
          </div>

          <button
            onClick={testEndpoint}
            disabled={testing}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
          >
            {testing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5" />
                Run Diagnostic Tests
              </>
            )}
          </button>

          {results && (
            <div className="mt-8 space-y-6">
              {/* Server Status */}
              <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  {results.serverReachable ? (
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-red-400" />
                  )}
                  <h2 className="text-xl font-semibold text-white">Server Status</h2>
                </div>
                <p className={`${results.serverReachable ? 'text-green-400' : 'text-red-400'}`}>
                  {results.serverReachable
                    ? '✓ Server is reachable'
                    : `✗ Cannot reach server${results.serverError ? `: ${results.serverError}` : ''}`}
                </p>
              </div>

              {/* Endpoint Tests */}
              {results.endpoints.map((test, index) => (
                <div key={index} className="bg-white/5 rounded-lg p-6 border border-white/10">
                  <h3 className="text-lg font-semibold text-white mb-4">{test.endpoint}</h3>
                  
                  <div className="space-y-3">
                    <div>
                      <span className="text-purple-300 text-sm">URL:</span>
                      <p className="text-white font-mono text-sm break-all">{test.url}</p>
                    </div>

                    <div>
                      <span className="text-purple-300 text-sm">Status:</span>
                      <p className={`font-semibold ${getStatusColor(test.status)}`}>
                        {test.status || 'No response'}
                      </p>
                    </div>

                    {test.error && (
                      <div>
                        <span className="text-red-300 text-sm">Error:</span>
                        <p className="text-red-400 text-sm mt-1">{test.error}</p>
                      </div>
                    )}

                    {test.response !== null && test.response !== undefined && (
                      <div>
                        <span className="text-purple-300 text-sm">Response:</span>
                        <pre className="mt-2 bg-black/30 rounded p-4 text-xs text-white overflow-x-auto max-h-64 overflow-y-auto">
                          {typeof test.response === 'string'
                            ? test.response
                            : JSON.stringify(test.response, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Common Issues & Solutions */}
              <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 rounded-lg p-6 border border-purple-500/30">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                  Common 500 Error Causes
                </h3>
                <ul className="space-y-3 text-purple-100 text-sm">
                  <li className="flex gap-2">
                    <span className="text-purple-400">•</span>
                    <span><strong>Database connection issues:</strong> Check if your database is running and connection string is correct</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-purple-400">•</span>
                    <span><strong>Missing database tables:</strong> Ensure 'creators' table exists and has proper schema</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-purple-400">•</span>
                    <span><strong>Query parameter handling:</strong> Server might not be handling page/limit params correctly</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-purple-400">•</span>
                    <span><strong>Authentication middleware:</strong> Check if auth middleware is failing before reaching the endpoint</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-purple-400">•</span>
                    <span><strong>Server logs:</strong> Check your backend console for error stack traces</span>
                  </li>
                </ul>
              </div>

              {/* Next Steps */}
              <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4">Next Steps</h3>
                <ol className="space-y-2 text-purple-100 text-sm list-decimal list-inside">
                  <li>Check your backend server console for error logs</li>
                  <li>Verify database connection and that the 'creators' table exists</li>
                  <li>Test the endpoint directly with curl or Postman</li>
                  <li>Check if authentication token is being sent correctly</li>
                  <li>Review the backend route handler for /api/creators</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default APIDebugger;

