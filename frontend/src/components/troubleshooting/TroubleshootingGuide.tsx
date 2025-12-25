import React, { useState } from 'react';
import { CheckCircle, AlertCircle, Play, RefreshCw, Terminal, Server } from 'lucide-react';

const TroubleshootingGuide = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const steps = [
    {
      id: 1,
      title: "Check if Backend is Running",
      icon: Server,
      description: "First, let's verify if the backend server is running on port 3001",
      commands: [
        {
          label: "Check port status (PowerShell)",
          code: "Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue",
          explanation: "This checks if anything is listening on port 3001"
        }
      ],
      expected: "If nothing shows up, the server is NOT running",
      solution: "Proceed to next step to start the server"
    },
    {
      id: 2,
      title: "Navigate to Backend Directory",
      icon: Terminal,
      description: "Open PowerShell and navigate to your backend folder",
      commands: [
        {
          label: "Navigate to backend",
          code: "cd C:\\desktop\\dreamlust-project\\backend",
          explanation: "Change to the backend directory"
        }
      ],
      expected: "You should see your terminal prompt change to the backend directory",
      solution: "Now you're ready to start the server"
    },
    {
      id: 3,
      title: "Start the Backend Server",
      icon: Play,
      description: "Use the automated startup script (RECOMMENDED)",
      commands: [
        {
          label: "Option 1: Automated Script (Best)",
          code: ".\\start-server.ps1",
          explanation: "This handles port conflicts and dependencies automatically"
        },
        {
          label: "Option 2: Manual Start",
          code: "bun run dev",
          explanation: "Direct server start (use if script fails)"
        }
      ],
      expected: "You should see: 🚀 Server running on http://localhost:3001",
      solution: "Server should now be running"
    },
    {
      id: 4,
      title: "Verify Server is Responding",
      icon: CheckCircle,
      description: "Test if the backend API is accessible",
      commands: [
        {
          label: "Test health endpoint (PowerShell)",
          code: "Invoke-WebRequest -Uri \"http://localhost:3001/health\"",
          explanation: "This checks if the API responds"
        },
        {
          label: "Or test in browser",
          code: "http://localhost:3001/health",
          explanation: "Open this URL in your browser"
        }
      ],
      expected: "Should return: {\"success\":true,\"message\":\"API is healthy\"}",
      solution: "If successful, backend is working!"
    },
    {
      id: 5,
      title: "Refresh Your Browser",
      icon: RefreshCw,
      description: "Clear cache and reload the login page",
      commands: [
        {
          label: "Hard Refresh",
          code: "Press: Ctrl + Shift + R",
          explanation: "This clears the cache and reloads the page"
        },
        {
          label: "Or Regular Refresh",
          code: "Press: F5",
          explanation: "Standard page reload"
        }
      ],
      expected: "The connection error should disappear",
      solution: "You should now be able to log in!"
    }
  ];

  const troubleshootingTips = [
    {
      issue: "Port 3001 Already in Use",
      solution: "Kill the process using the port",
      command: "$pid = Get-NetTCPConnection -LocalPort 3001 | Select-Object -ExpandProperty OwningProcess; Stop-Process -Id $pid -Force"
    },
    {
      issue: "Server Keeps Stopping",
      solution: "Use the monitor script to auto-restart",
      command: "cd backend\nbun run start:monitor"
    },
    {
      issue: "Prisma Errors",
      solution: "Regenerate Prisma client",
      command: "cd backend\nbunx prisma generate"
    },
    {
      issue: "Database Connection Failed",
      solution: "Check DATABASE_URL in backend/.env",
      command: "Check that DATABASE_URL is set correctly"
    }
  ];

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const markComplete = (stepId: number) => {
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps([...completedSteps, stepId]);
    }
  };

  interface Step {
    id: number;
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
    commands: Array<{
      label: string;
      code: string;
      explanation: string;
    }>;
    expected: string;
    solution: string;
  }

  const StepCard = ({ step, index }: { step: Step; index: number }) => {
    const Icon = step.icon;
    const isCompleted = completedSteps.includes(step.id);
    const isCurrent = currentStep === index;

    return (
      <div 
        className={`border rounded-lg p-6 mb-4 transition-all ${
          isCurrent ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 shadow-lg' : 
          isCompleted ? 'border-green-500 bg-green-50 dark:bg-green-950' : 
          'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800'
        }`}
      >
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-full ${
            isCompleted ? 'bg-green-500' : 
            isCurrent ? 'bg-blue-500' : 
            'bg-gray-400'
          }`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                Step {step.id}: {step.title}
              </h3>
              {isCompleted && (
                <CheckCircle className="w-6 h-6 text-green-500" />
              )}
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-4">{step.description}</p>
            
            <div className="space-y-3">
              {step.commands.map((cmd, idx) => (
                <div key={idx} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{cmd.label}</span>
                    <button
                      onClick={() => copyToClipboard(cmd.code)}
                      className="px-3 py-1 text-xs bg-gray-800 dark:bg-gray-700 text-white rounded hover:bg-gray-700 dark:hover:bg-gray-600 transition"
                    >
                      Copy
                    </button>
                  </div>
                  <pre className="bg-gray-900 dark:bg-black text-green-400 p-3 rounded text-sm overflow-x-auto">
                    <code>{cmd.code}</code>
                  </pre>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{cmd.explanation}</p>
                </div>
              ))}
            </div>
            
            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 mb-1">Expected Result:</p>
              <p className="text-sm text-yellow-700 dark:text-yellow-400">{step.expected}</p>
            </div>
            
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">Next Step:</p>
              <p className="text-sm text-blue-700 dark:text-blue-400">{step.solution}</p>
            </div>
            
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  markComplete(step.id);
                  if (index < steps.length - 1) {
                    setCurrentStep(index + 1);
                  }
                }}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
              >
                ✓ Mark Complete & Continue
              </button>
              
              {index > 0 && (
                <button
                  onClick={() => setCurrentStep(index - 1)}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
                >
                  ← Previous Step
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 mb-8">
          <div className="text-center mb-8">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-2">
              Backend Connection Troubleshooter
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Fix: "Cannot connect to backend server at http://localhost:3001"
            </p>
          </div>
          
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800 dark:text-red-300">
              <strong>Problem:</strong> The backend server is not running on port 3001. 
              Follow these steps to start it and connect your frontend.
            </p>
          </div>
          
          <div className="flex items-center justify-between mb-6">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Progress: {completedSteps.length} / {steps.length} steps completed
            </div>
            <div className="w-64 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${(completedSteps.length / steps.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
        
        <div>
          {steps.map((step, index) => (
            <StepCard key={step.id} step={step} index={index} />
          ))}
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mt-8">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-orange-500" />
            Common Issues & Quick Fixes
          </h2>
          
          <div className="space-y-4">
            {troubleshootingTips.map((tip, idx) => (
              <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-2">{tip.issue}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{tip.solution}</p>
                <div className="flex items-center justify-between bg-gray-900 dark:bg-black text-green-400 p-3 rounded">
                  <pre className="text-sm overflow-x-auto flex-1">
                    <code>{tip.command}</code>
                  </pre>
                  <button
                    onClick={() => copyToClipboard(tip.command)}
                    className="ml-3 px-3 py-1 text-xs bg-gray-700 dark:bg-gray-800 text-white rounded hover:bg-gray-600 dark:hover:bg-gray-700"
                  >
                    Copy
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 mt-8">
          <h3 className="font-bold text-green-800 dark:text-green-300 mb-2 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Once Backend is Running:
          </h3>
          <ul className="text-sm text-green-700 dark:text-green-400 space-y-1 ml-7">
            <li>• You should see: "🚀 Server running on http://localhost:3001"</li>
            <li>• Health check should return: {`{"success":true}`}</li>
            <li>• Refresh browser with Ctrl+Shift+R</li>
            <li>• Login page should work without connection errors</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TroubleshootingGuide;
