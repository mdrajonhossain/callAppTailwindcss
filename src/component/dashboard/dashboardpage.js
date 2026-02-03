import { supabase } from "../../supabaseClient";

function Dashboardpage() {
  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      alert(error.message);
    }
  };

  const users = [
    { id: 1, name: "John Doe", online: true },
    { id: 2, name: "Sarah Smith", online: false },
    { id: 3, name: "Alex Johnson", online: true },
    { id: 4, name: "Emma Wilson", online: true },
    { id: 5, name: "Michael Brown", online: false },
    { id: 6, name: "Olivia Davis", online: true },
    { id: 7, name: "William Miller", online: false },
    { id: 8, name: "Sophia Taylor", online: true },
    { id: 9, name: "James Anderson", online: true },
    { id: 10, name: "Isabella Thomas", online: false },
    { id: 11, name: "Benjamin Jackson", online: true },
    { id: 12, name: "Mia White", online: false },
    { id: 13, name: "Lucas Harris", online: true },
    { id: 14, name: "Charlotte Martin", online: true },
    { id: 15, name: "Ethan Thompson", online: false },
    { id: 16, name: "Amelia Garcia", online: true },
    { id: 17, name: "Alexander Martinez", online: false },
    { id: 18, name: "Harper Robinson", online: true },
    { id: 19, name: "Daniel Clark", online: true },
    { id: 20, name: "Ella Rodriguez", online: false },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      {/* Dashboard Card */}
      <div className="w-full max-w-4xl bg-white shadow-md rounded-lg flex flex-col h-[80vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-800">Messages</h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{users.length} Users</span>
            <button
              onClick={handleSignOut}
              className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium py-1 px-3 rounded transition duration-300"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Scrollable User List */}
        <div className="flex-1 overflow-y-auto divide-y">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition"
            >
              {/* Left: Avatar + Name */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold">
                    {user.name.charAt(0)}
                  </div>
                  {/* Online indicator */}
                  <span
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                      user.online ? "bg-green-500" : "bg-gray-400"
                    }`}
                  />
                </div>

                <div>
                  <p className="font-medium text-gray-800">{user.name}</p>
                  <p className="text-sm text-gray-500">
                    {user.online ? "Online" : "Offline"}
                  </p>
                </div>
              </div>

              {/* Right: Call Icons (emojis) */}
              <div className="flex gap-3">
                <button className="p-2 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-600 transition text-lg">
                  📞
                </button>

                <button className="p-2 rounded-full bg-purple-100 hover:bg-purple-200 text-purple-600 transition text-lg">
                  🎥
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Dashboardpage;