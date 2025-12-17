import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLoginMutation } from "../services/inventoryApi";

const Login = ({ setIsAuthenticated }) => {
  const navigate = useNavigate();
  const [login, { isLoading }] = useLoginMutation();

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Prefill remembered email & redirect if already logged in
  useEffect(() => {
    const remembered = localStorage.getItem("rememberEmail");
    if (remembered) setForm((p) => ({ ...p, email: remembered }));

    const existing = localStorage.getItem("token");
    if (existing) navigate("/");
  }, [navigate]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const data = await login(form).unwrap();
      // Expected shape: { success, jwtToken, name, email, role, message }
      if (data?.success) {
        localStorage.setItem("token", data.jwtToken);
        localStorage.setItem(
          "user",
          JSON.stringify({ name: data.name, email: data.email, role: data.role })
        );
        localStorage.setItem("rememberEmail", form.email);

        setIsAuthenticated?.(true);
        navigate("/");
      } else {
        setError(data?.message || "Login failed.");
      }
    } catch (err) {
      setError(err?.data?.message || "Login failed. Try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="backdrop-blur bg-white/80 shadow-xl rounded-2xl border border-slate-100 p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="h-12 w-12 rounded-xl bg-blue-600/10 flex items-center justify-center">
              <span className="text-2xl">🔐</span>
            </div>
          </div>

          <h1 className="text-center text-2xl font-semibold text-slate-800">Welcome back</h1>
          <p className="text-center text-slate-500 mt-1 mb-6">Sign in to continue to Inventory App</p>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">📧</span>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  placeholder="you@company.com"
                  className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔒</span>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-10 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs px-2 py-1 rounded-md text-slate-500 hover:text-slate-700"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 text-white font-medium py-2.5 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Signing in…
                </>
              ) : (
                <>Login</>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-6">Secure access • Do not share your credentials</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
