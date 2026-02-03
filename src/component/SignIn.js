import { Link } from "react-router-dom";


function SignIn() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-8">
        
        {/* Title */}
        <h2 className="text-3xl font-bold text-center text-gray-800">
          Welcome Back 👋
        </h2>
        <p className="text-center text-gray-500 mt-2">
          Sign in to your account
        </p>

        {/* Form */}
        <form className="mt-8 space-y-5">
          
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-600">
              Email
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              className="mt-1 w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-600">
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              className="mt-1 w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Remember + Forgot */}
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-gray-600">
              <input type="checkbox" className="rounded" />
              Remember me
            </label>
            <a href="#" className="text-blue-600 hover:underline">
              Forgot password?
            </a>
          </div>

          {/* Button */}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition duration-300"
          >
            Sign In
          </button>
        </form>

       
        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Don’t have an account?
          <Link
            to="/signup"
            className="text-blue-600 font-medium hover:underline ml-1"
          >
            Sign Up
          </Link>
        </p>

        <p className="text-center text-sm text-gray-500 mt-6">          
          <Link
            to="/"
            className="text-blue-600 font-medium hover:underline ml-1"
          >
            Home page
          </Link>
        </p>
      </div>
    </div>
  );
}

export default SignIn;
