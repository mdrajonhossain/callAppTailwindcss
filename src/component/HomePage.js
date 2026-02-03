import { Link } from "react-router-dom";

function App() {
  return (
    <div className="min-h-screen bg-gray-50">

      {/* Navbar */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">

          {/* Left: Logo */}
          <div>
            <h1 className="text-2xl font-bold text-purple-600">
              CallEarn
            </h1>
            <p className="text-sm text-gray-500">
              Earn through conversations
            </p>
          </div>

          {/* Right: Sign In Button */}
          <div>
            <Link
              to="/signin"
              className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg font-medium transition"
            >
              Sign In
            </Link>
          </div>

        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-purple-600 to-blue-500 text-white">
        <div className="max-w-7xl mx-auto px-6 py-20 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">

          {/* Text */}
          <div>
            <h2 className="text-4xl md:text-5xl font-bold leading-tight">
              Earn Money Through  
              <span className="block text-yellow-300">
                Video & Audio Calls
              </span>
            </h2>

            <p className="mt-6 text-lg text-purple-100">
              Connect with people globally, share your knowledge,
              provide guidance, and earn securely through real-time
              video and audio conversations.
            </p>

            <ul className="mt-8 space-y-3 text-purple-100">
              <li>✔ Work from anywhere</li>
              <li>✔ Get paid per minute</li>
              <li>✔ Safe & secure platform</li>
              <li>✔ High quality video & audio</li>
            </ul>
          </div>

          {/* Image */}
          <div className="flex justify-center">
            <img
              src="https://illustrations.popsy.co/white/video-call.svg"
              alt="Video Call Illustration"
              className="w-full max-w-md"
            />
          </div>

        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <h3 className="text-3xl font-bold text-center text-gray-800">
          How It Works
        </h3>
        <p className="text-center text-gray-500 mt-2">
          Simple steps to start earning
        </p>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">

          <div className="bg-white p-8 rounded-xl shadow text-center">
            <div className="text-4xl mb-4">🎥</div>
            <h4 className="text-xl font-semibold text-gray-800">
              Go Online
            </h4>
            <p className="mt-2 text-gray-500">
              Be available for video or audio calls
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow text-center">
            <div className="text-4xl mb-4">💬</div>
            <h4 className="text-xl font-semibold text-gray-800">
              Talk & Help
            </h4>
            <p className="mt-2 text-gray-500">
              Share knowledge, advice, or companionship
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow text-center">
            <div className="text-4xl mb-4">💰</div>
            <h4 className="text-xl font-semibold text-gray-800">
              Earn Instantly
            </h4>
            <p className="mt-2 text-gray-500">
              Get paid based on call duration
            </p>
          </div>

        </div>
      </section>

      {/* Trust Section */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h3 className="text-3xl font-bold text-gray-800">
            Built for Trust & Privacy
          </h3>
          <p className="mt-4 text-gray-500 max-w-2xl mx-auto">
            We use secure real-time communication technology to ensure
            your conversations are private, reliable, and smooth.
          </p>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-8 text-gray-600">
            <p>🔒 End-to-end secure calls</p>
            <p>⚡ Low latency streaming</p>
            <p>🌍 Global connectivity</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-100 border-t">
        <div className="max-w-7xl mx-auto px-6 py-6 text-center text-gray-500">
          © 2026 CallEarn. Video & Audio Call Earning Platform
        </div>
      </footer>

    </div>
  );
}

export default App;
