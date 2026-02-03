import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import SignIn from "./component/SignIn";
import SignUp from "./component/SignUp";
import Home from "./component/HomePage";
import Dashboardpage from "./component/dashboard/dashboardpage";

function App() {
  return (
    <Router>
      <Routes>
        {/* Home / Landing Page */}
        <Route path="/" element={<Home />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/dashboard" element={<Dashboardpage />} />
      </Routes>
    </Router>
  );
}

export default App;
