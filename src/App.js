import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

import SignIn from "./component/SignIn";
import SignUp from "./component/SignUp";
import Home from "./component/HomePage";
import Dashboardpage from "./component/dashboard/dashboardpage";

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <Router>
      <Routes>
        {/* Home / Landing Page */}
        <Route path="/" element={<Home />} />
        <Route path="/signin" element={!session ? <SignIn /> : <Navigate to="/dashboard" />} />
        <Route path="/signup" element={!session ? <SignUp /> : <Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={session ? <Dashboardpage /> : <Navigate to="/signin" />} />
      </Routes>
    </Router>
  );
}

export default App;
