import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { auth } from "@/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import teamWorkImg from '../../assets/team-work.jpg';

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      alert("Login successful!");
      navigate("/dashboard");
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 px-2 sm:px-4">
      <div className="flex flex-col md:flex-row bg-white rounded-lg shadow-lg overflow-hidden w-full max-w-4xl mx-auto">
        {/* Left: Login form and welcome text */}
        <div className="flex-1 flex flex-col justify-center p-6 sm:p-8 min-w-0">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-4 sm:mb-6 text-blue-700 text-center">Welcome Back</h2>
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div>
              <Label htmlFor="email" className="mb-1">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="password" className="mb-1">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
                className="mt-1"
              />
            </div>
            <Button type="submit" className="w-full mt-2" disabled={loading}>{loading ? "Logging in..." : "Login"}</Button>
          </form>
          <div className="text-center mt-3 sm:mt-4">
            <button
              type="button"
              onClick={() => navigate("/register")}
              className="text-blue-600 hover:underline text-sm font-medium"
            >
              Don't have an account? Register
            </button>
          </div>
        </div>
        {/* Right: Illustration */}
        <div className="hidden md:flex flex-1 items-center justify-center bg-blue-50 p-4 sm:p-8">
          <img
            src={teamWorkImg}
            alt="Team collaboration illustration"
            className="max-w-full h-auto rounded-lg shadow-md object-contain"
          />
        </div>
      </div>
    </div>
  );
}

export default Login;
