import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSignupMutation } from "../services/inventoryApi";

const Signup = () => {
  const navigate = useNavigate();
  const [signup, { isLoading }] = useSignupMutation();

  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");

  // If already logged in, bounce to home
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
      const data = await signup(form).unwrap(); // { success, message, ... }
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
    <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4 text-center">📝 Sign Up</h2>
      {error && <p className="text-red-600 mb-3 text-sm text-center">{error}</p>}

      <form onSubmit={handleSignup} className="space-y-4">
        <input
          type="text"
          name="name"
          placeholder="Full Name"
          value={form.name}
          onChange={handleChange}
          required
          className="w-full border px-3 py-2 rounded"
        />

        <input
          type="email"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          required
          className="w-full border px-3 py-2 rounded"
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          required
          className="w-full border px-3 py-2 rounded"
        />

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 text-white font-semibold py-2 rounded hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading ? "Creating..." : "Sign Up"}
        </button>
      </form>
    </div>
  );
};

export default Signup;
