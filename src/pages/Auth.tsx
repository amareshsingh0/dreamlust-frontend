import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { api } from "@/lib/api";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Sign In Schema
const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean(),
});

// Sign Up Schema
const signUpSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  birthDate: z.string().refine((date) => {
    const birth = new Date(date);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age >= 18 && age <= 120;
  }, "You must be at least 18 years old and enter a valid date of birth"),
});

type SignInFormData = z.infer<typeof signInSchema>;
type SignUpFormData = z.infer<typeof signUpSchema>;

const Auth = () => {
  const { login, register: registerUser, isAuthenticated, isLoading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  // Removed backendConnected state - health check removed to prevent blocking render
  // Backend connectivity will be checked during actual login/register attempts

  // Set mode based on route
  useEffect(() => {
    if (location.pathname === "/signup") {
      setMode("signup");
    } else {
      setMode("signin");
    }
  }, [location.pathname]);

  // Sign In Form
  const signInForm = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  // Sign Up Form
  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      birthDate: "",
    },
  });

  const onSignIn = async (data: SignInFormData) => {
    // Prevent multiple simultaneous login attempts
    if (loading) {
      console.warn('⚠️ Login already in progress, ignoring duplicate request');
      return;
    }
    
    setLoading(true);
    
    console.log('🚀 Sign in attempt started for:', data.email);
    
    try {
      // Validate inputs before making request
      if (!data.email || !data.email.includes('@')) {
        throw new Error('Please enter a valid email address');
      }
      if (!data.password || data.password.length === 0) {
        throw new Error('Please enter your password');
      }
      
      await login(data.email, data.password, data.rememberMe || false);
      
      console.log('✅ Sign in successful, redirecting...');
      toast.success("Welcome back!");
      
      // Small delay to ensure state is updated before navigation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Redirect to home or previous page
      const returnTo = new URLSearchParams(location.search).get("returnTo") || "/";
      navigate(returnTo, { replace: true }); // Use replace to prevent back button issues
    } catch (error: any) {
      console.error("❌ Sign in exception:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      
      // Provide more specific error messages
      let errorMessage = "Failed to sign in. ";
      
      if (error.message?.includes("timeout") || error.message?.includes("Timeout")) {
        errorMessage = "Request timed out. Please check your connection and try again.";
      } else if (error.message?.includes("Failed to fetch") || error.message?.includes("NetworkError") || error.message?.includes("NETWORK_ERROR")) {
        errorMessage = `Cannot connect to backend server at ${API_BASE_URL}. Please ensure the backend is running.`;
      } else if (error.message?.includes("Invalid email or password") || error.message?.includes("Invalid credentials") || error.message?.includes("UNAUTHORIZED")) {
        errorMessage = "Invalid email or password. Please check your credentials and try again.";
      } else if (error.message?.includes("Account is not active") || error.message?.includes("INACTIVE")) {
        errorMessage = "Your account is not active. Please contact support.";
      } else if (error.message?.includes("Invalid response format") || error.message?.includes("Missing")) {
        errorMessage = error.message; // Use the specific error message
      } else if (error.message) {
        errorMessage = error.message;
      } else {
        errorMessage += "Please check your credentials and try again.";
      }
      
      console.error("Displaying error to user:", errorMessage);
      toast.error(errorMessage);
      signInForm.setError("root", { message: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const onSignUp = async (data: SignUpFormData) => {
    setLoading(true);
    
    // Track signup started event
    api.analytics.track('signup_started', {
      email: data.email,
      username: data.username,
    }).catch(() => {}); // Non-blocking
    
    try {
      await registerUser(data.email, data.username, data.password, data.birthDate);
      
      toast.success("Account created successfully!");
      navigate("/");
    } catch (error: any) {
      console.error("Registration exception:", error);
      const errorMessage = error.message || "Failed to create account. Please try again.";
      toast.error(errorMessage);
      signUpForm.setError("root", { message: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading && !loading) {
      navigate("/");
    }
  }, [isAuthenticated, authLoading, loading, navigate]);

  return (
    <>
      <Helmet>
        <title>{mode === "signin" ? "Sign In" : "Sign Up"} - PassionFantasia</title>
      </Helmet>
      <main className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            {/* Header */}
            <header className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">Welcome</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Sign in to your account or create a new one
              </p>
            </header>

            {/* Backend connectivity check removed - errors will be shown during login/register attempts */}

            {/* Mode Tabs */}
            <div className="flex mb-6 border-b border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  navigate("/auth");
                }}
                className={`flex-1 py-3 text-center font-medium transition-colors min-h-[44px] ${
                  mode === "signin"
                    ? "text-primary-foreground bg-primary border-b-2 border-primary-foreground"
                    : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  navigate("/signup");
                }}
                className={`flex-1 py-3 text-center font-medium transition-colors min-h-[44px] ${
                  mode === "signup"
                    ? "text-primary-foreground bg-primary border-b-2 border-primary-foreground"
                    : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Sign In Form */}
            {mode === "signin" && (
              <form onSubmit={signInForm.handleSubmit(onSignIn)} className="space-y-4">
                <div>
                  <label htmlFor="signin-email" className="block text-sm font-medium mb-2">
                    Email
                  </label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    {...signInForm.register("email")}
                    className={signInForm.formState.errors.email ? "border-red-500" : ""}
                  />
                  {signInForm.formState.errors.email && (
                    <p className="mt-1 text-sm text-red-500">
                      {signInForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="signin-password" className="block text-sm font-medium mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      id="signin-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      {...signInForm.register("password")}
                      className={signInForm.formState.errors.password ? "border-red-500 pr-10" : "pr-10"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 min-h-[44px] min-w-[44px] flex items-center justify-center"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {signInForm.formState.errors.password && (
                    <p className="mt-1 text-sm text-red-500">
                      {signInForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      id="remember-me"
                      type="checkbox"
                      {...signInForm.register("rememberMe")}
                      className="rounded border-gray-300 w-5 h-5 min-w-[20px] min-h-[20px]"
                    />
                    <label htmlFor="remember-me" className="ml-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer min-h-[44px] flex items-center">
                      Remember me
                    </label>
                  </div>
                  <Link
                    to="/forgot-password"
                    className="text-sm text-pink-500 hover:text-pink-600 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-pink-500 hover:bg-pink-600 text-white"
                >
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            )}

            {/* Sign Up Form */}
            {mode === "signup" && (
              <form onSubmit={signUpForm.handleSubmit(onSignUp)} className="space-y-4">
                <div>
                  <label htmlFor="signup-username" className="block text-sm font-medium mb-2">
                    Username
                  </label>
                  <Input
                    id="signup-username"
                    type="text"
                    placeholder="@yourname"
                    autoComplete="username"
                    {...signUpForm.register("username")}
                    className={signUpForm.formState.errors.username ? "border-red-500" : ""}
                  />
                  {signUpForm.formState.errors.username && (
                    <p className="mt-1 text-sm text-red-500">
                      {signUpForm.formState.errors.username.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="signup-email" className="block text-sm font-medium mb-2">
                    Email
                  </label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    {...signUpForm.register("email")}
                    className={signUpForm.formState.errors.email ? "border-red-500" : ""}
                  />
                  {signUpForm.formState.errors.email && (
                    <p className="mt-1 text-sm text-red-500">
                      {signUpForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="signup-password" className="block text-sm font-medium mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      autoComplete="new-password"
                      {...signUpForm.register("password")}
                      className={signUpForm.formState.errors.password ? "border-red-500 pr-10" : "pr-10"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 min-h-[44px] min-w-[44px] flex items-center justify-center"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Must be at least 6 characters
                  </p>
                  {signUpForm.formState.errors.password && (
                    <p className="mt-1 text-sm text-red-500">
                      {signUpForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="signup-birthdate" className="block text-sm font-medium mb-2">
                    Date of Birth <span className="text-gray-500">(recommended)</span>
                  </label>
                  <Input
                    id="signup-birthdate"
                    type="date"
                    {...signUpForm.register("birthDate")}
                    className={signUpForm.formState.errors.birthDate ? "border-red-500" : ""}
                    max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                    min={new Date(new Date().setFullYear(new Date().getFullYear() - 120)).toISOString().split('T')[0]}
                  />
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    You must be at least 18 years old. This helps us show age-appropriate content.
                  </p>
                  {signUpForm.formState.errors.birthDate && (
                    <p className="mt-1 text-sm text-red-500">
                      {signUpForm.formState.errors.birthDate.message}
                    </p>
                  )}
                </div>

                <div className="text-sm text-gray-600 dark:text-gray-400">
                  By signing up, you agree to our{" "}
                  <Link to="/terms" className="text-primary hover:underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link to="/privacy" className="text-primary hover:underline">
                    Privacy Policy
                  </Link>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-pink-500 hover:bg-pink-600 text-white"
                >
                  {loading ? "Creating account..." : "Create Account"}
                </Button>
              </form>
            )}
          </div>
        </div>
      </main>
    </>
  );
};

export default Auth;
