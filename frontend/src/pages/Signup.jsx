// src/pages/Signup.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSignupMutation } from "../services/inventoryApi";

const Signup = () => {
  const navigate = useNavigate();
  const [signup, { isLoading }] = useSignupMutation();

  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) navigate("/");
  }, [navigate]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const data = await signup(form).unwrap();
      if (data?.success) {
        alert("🎉 Signup successful!");
        navigate("/login");
      } else {
        setError(data?.message || "Signup failed.");
      }
    } catch (err) {
      setError(err?.data?.message || "Signup failed.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
        {/* LEFT PANEL (same branding) */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-indigo-500 blur-3xl" />
            <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-cyan-400 blur-3xl" />
          </div>

          <div className="relative h-full px-6 sm:px-10 py-10 flex flex-col">
            <div>
              <div className="text-2xl font-semibold tracking-tight">
                Quotations &amp; POs
              </div>
              <div className="text-sm text-slate-200 mt-1">
                Business Documents Console
              </div>
            </div>

            <div className="mt-auto mb-8">
              <ul className="space-y-3 text-sm text-slate-200">
                <li className="flex gap-2">
                  <span className="mt-0.5">•</span>
                  <span>Maintain item, company &amp; client masters</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5">•</span>
                  <span>Generate quotations with GST &amp; features block</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5">•</span>
                  <span>Create purchase orders in a single click</span>
                </li>
              </ul>

              <div className="text-xs text-slate-400 mt-10">© 2025 Q &amp; P System</div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="flex items-center justify-center px-4 py-10">
          <div className="w-full max-w-md">
            <div className="rounded-2xl bg-white border border-slate-200 shadow-lg">
              <div className="p-6 sm:p-7">
                <div className="text-center">
                  <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">
                    Create your account
                  </h1>
                  <p className="text-sm text-slate-500 mt-1">
                    Fill details to get started.
                  </p>
                </div>

                {error && (
                  <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSignup} className="mt-6 space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Enter your name"
                      required
                      className="w-full h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none
                                 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="Enter your email"
                      required
                      className="w-full h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none
                                 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        placeholder="Create a password"
                        required
                        className="w-full h-11 rounded-lg border border-slate-200 bg-white px-3 pr-16 text-sm outline-none
                                   focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold px-2 py-1
                                   rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Tip: Use at least 8 characters for better security.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className={[
                      "w-full h-11 rounded-lg text-sm font-semibold text-white",
                      isLoading
                        ? "bg-indigo-400 cursor-wait"
                        : "bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800",
                    ].join(" ")}
                  >
                    {isLoading ? "Creating..." : "Create Account"}
                  </button>

                  <div className="text-center text-sm text-slate-500 pt-2">
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => navigate("/login")}
                      className="font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                      Login
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div className="text-center text-xs text-slate-400 mt-4">
              Secure access • Do not share your credentials
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
