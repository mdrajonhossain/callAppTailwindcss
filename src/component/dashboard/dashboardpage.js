import { useEffect, useState, useRef } from "react";
import { supabase } from "../../supabaseClient";

const servers = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
};

function Dashboardpage() {
  const [users, setUsers] = useState([]);
  const [myself, setMyself] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callActive, setCallActive] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [callingUser, setCallingUser] = useState(null);
  const [isRinging, setIsRinging] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerConnection = useRef();
  const pendingCandidates = useRef([]);
  const channelRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    // 1. Get current user
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

        setMyself(user);

        // Auto-sync: Add user to profiles table if missing (fixes "user not showing" for existing users)
        const { error } = await supabase.from("profiles").upsert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.email?.split("@")[0],
        });

        if (error) console.error("Error syncing profile:", error);
        
        // 2. Fetch all users from profiles table (now includes current user)
        fetchUsers();

      // Initialize Ringtone
      audioRef.current = new Audio("/Hello-Tune.mp3");
      audioRef.current.loop = true;

      // 3. Subscribe to signaling channel with Presence
      const channel = supabase.channel("video-call-signaling", {
        config: {
          presence: {
            key: user.id,
          },
        },
      });
      channelRef.current = channel;

      channel
        .on("broadcast", { event: "signal" }, (payload) => {
          handleSignal(payload.payload);
        })
        .on("presence", { event: "sync" }, () => {
          const newState = channel.presenceState();
          const onlineIds = new Set(Object.keys(newState));
          setOnlineUsers(onlineIds);
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await channel.track({ online_at: new Date().toISOString() });
          }
        });
    };

    init();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase.from("profiles").select("*");
    if (error) {
      console.error("Error fetching users:", error);
      if (error.code === "PGRST205") {
        alert("Setup Required: The 'profiles' table is missing in Supabase.\n\nPlease run the SQL script provided in the chat to create it.");
      }
    } else {
      setUsers(data || []);
    }
  };

  const handleSignal = async (data) => {
    // Only handle signals meant for me
    const currentUser = await supabase.auth.getUser();
    if (data.target !== currentUser.data.user?.id) return;

    switch (data.type) {
      case "offer":
        setIncomingCall({
          callerId: data.from,
          callerName: data.callerName,
          sdp: data.sdp,
        });
        pendingCandidates.current = []; // Reset candidate queue for new call

        try {
          await audioRef.current.play();
        } catch (err) {
          console.error("Ringtone play error:", err);
        }
        break;
      case "answer":
        if (peerConnection.current) {
          setIsRinging(false);
          await peerConnection.current.setRemoteDescription(
            new RTCSessionDescription(data.sdp)
          );
          // Process any queued candidates
          while (pendingCandidates.current.length > 0) {
            const candidate = pendingCandidates.current.shift();
            try {
              await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
              console.error("Error adding queued ice candidate:", e);
            }
          }
        }
        break;
      case "candidate":
        if (peerConnection.current && peerConnection.current.remoteDescription) {
          try {
            await peerConnection.current.addIceCandidate(
              new RTCIceCandidate(data.candidate)
            );
          } catch (e) {
            console.error("Error adding ice candidate:", e);
          }
        } else {
          // Queue candidate if remote description is not set yet
          pendingCandidates.current.push(data.candidate);
        }
        break;
      case "end-call":
        window.location.reload();
        break;
      default:
        break;
    }
  };

  const startCall = async (targetUserId, targetUserName) => {
    setCallingUser({ id: targetUserId, name: targetUserName });
    setCallActive(true);
    setIsRinging(true);

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    setLocalStream(stream);
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;

    const pc = new RTCPeerConnection(servers);
    peerConnection.current = pc;

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal({
          type: "candidate",
          target: targetUserId,
          candidate: event.candidate,
          from: myself.id,
        });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    sendSignal({
      type: "offer",
      target: targetUserId,
      callerName: myself.email, // Or full_name if available in myself object
      sdp: pc.localDescription,
      from: myself.id,
    });
  };

  const answerCall = async () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setCallingUser({ id: incomingCall.callerId, name: incomingCall.callerName });
    setCallActive(true);
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    setLocalStream(stream);
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;

    const pc = new RTCPeerConnection(servers);
    peerConnection.current = pc;

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal({
          type: "candidate",
          target: incomingCall.callerId,
          candidate: event.candidate,
          from: myself.id,
        });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
    };

    await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.sdp));
    
    // Process any queued candidates
    while (pendingCandidates.current.length > 0) {
      const candidate = pendingCandidates.current.shift();
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error("Error adding queued ice candidate:", e);
      }
    }

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    sendSignal({
      type: "answer",
      target: incomingCall.callerId,
      sdp: pc.localDescription,
      from: myself.id,
    });

    setIncomingCall(null);
  };

  const sendSignal = async (payload) => {
    const channel = channelRef.current || supabase.channel("video-call-signaling");
    await channel.send({
      type: "broadcast",
      event: "signal",
      payload: payload,
    });
  };

  const endCall = async () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (callingUser) {
      await sendSignal({
        type: "end-call",
        target: callingUser.id,
        from: myself.id,
      });
    }
    if (peerConnection.current) peerConnection.current.close();
    if (localStream) localStream.getTracks().forEach((track) => track.stop());
    setCallActive(false);
    setIncomingCall(null);
    setIsRinging(false);
    setCallingUser(null);
    setLocalStream(null);
    setRemoteStream(null);
    pendingCandidates.current = [];
    setTimeout(() => {
      window.location.reload(); // Simple reset
    }, 500);
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      alert(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-0 md:p-4">
      {/* Dashboard Card */}
      <div className="w-full max-w-4xl bg-white shadow-none md:shadow-md rounded-none md:rounded-lg flex flex-col h-screen md:h-[80vh]">
        {/* Header */}
        <div className="px-4 py-3 md:px-6 md:py-4 border-b flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-800">Messages</h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              {users.length} Users Found
            </span>
            <button
              onClick={handleSignOut}
              className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium py-1 px-3 rounded transition duration-300"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Incoming Call Modal */}
        {incomingCall && !callActive && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-[90%] max-w-sm flex flex-col items-center">
              <div className="w-24 h-24 bg-gradient-to-r from-purple-400 to-blue-500 rounded-full flex items-center justify-center mb-4 shadow-lg">
                <span className="text-4xl text-white font-bold">
                  {incomingCall.callerName ? incomingCall.callerName.charAt(0).toUpperCase() : "U"}
                </span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-1">Incoming Call</h3>
              <p className="text-gray-500 mb-8 text-center">{incomingCall.callerName}</p>
              
              <div className="flex gap-6 w-full justify-center">
                <button
                  onClick={async () => {
                    if (audioRef.current) {
                      audioRef.current.pause();
                      audioRef.current.currentTime = 0;
                    }
                    if (incomingCall?.callerId) {
                      await sendSignal({
                        type: "end-call",
                        target: incomingCall.callerId,
                        from: myself?.id,
                      });
                    }
                    setIncomingCall(null);
                  }}
                  className="flex flex-col items-center gap-1 group"
                >
                  <div className="w-14 h-14 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg group-hover:bg-red-600 transition-all transform group-hover:scale-110">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <span className="text-xs text-gray-500 font-medium">Decline</span>
                </button>

                <button
                  onClick={answerCall}
                  className="flex flex-col items-center gap-1 group"
                >
                  <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg group-hover:bg-green-600 transition-all transform group-hover:scale-110">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <span className="text-xs text-gray-500 font-medium">Accept</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Video Call Area */}
        {callActive && (
          <div className="flex-1 bg-black relative">
            {isRinging && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gray-900 text-white">
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-purple-500 rounded-full animate-ping opacity-75"></div>
                  <div className="relative w-32 h-32 bg-purple-600 rounded-full flex items-center justify-center border-4 border-gray-800 shadow-2xl">
                    <span className="text-5xl font-bold">
                      {callingUser?.name ? callingUser.name.charAt(0).toUpperCase() : "U"}
                    </span>
                  </div>
                </div>
                <h3 className="text-2xl font-semibold tracking-widest animate-pulse mb-2">Ringing...</h3>
                <p className="text-gray-400 text-lg mb-12">Calling {callingUser?.name}</p>
                
                <button
                  onClick={endCall}
                  className="bg-red-600 hover:bg-red-700 text-white rounded-full p-4 shadow-lg transition transform hover:scale-110"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <span className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
              Remote User
            </span>
            <button
              onClick={endCall}
              className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-red-600 hover:bg-red-700 text-white rounded-full p-4 shadow-lg"
            >
              End Call
            </button>
          </div>
        )}

        {/* Scrollable User List */}
        {!callActive && (
          <div className="flex-1 overflow-y-auto divide-y">
            {users.length === 0 && (
              <div className="p-6 text-center text-gray-500">
                No users found. (Make sure you have created the 'profiles' table in Supabase)
              </div>
            )}
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4 hover:bg-gray-50 transition"
            >
              {/* Left: Avatar + Name */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold">
                    {user.full_name ? user.full_name.charAt(0) : "U"}
                  </div>
                  {/* Online Indicator */}
                  <span
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                      onlineUsers.has(user.id) ? "bg-green-500" : "bg-gray-400"
                    }`}
                  ></span>
                </div>

                <div>
                  <p className="font-medium text-gray-800">{user.full_name}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
              </div>

              {/* Right: Call Icons (emojis) */}
              <div className="flex gap-3">
                {myself && user.id !== myself.id && (
                  <button
                    onClick={() => startCall(user.id, user.full_name)}
                    className="p-2 rounded-full bg-purple-100 hover:bg-purple-200 text-purple-600 transition text-lg"
                    title="Video Call"
                  >
                  🎥
                </button>
                )}
              </div>
            </div>
          ))}
        </div>
        )}
      </div>
    </div>
  );
}

export default Dashboardpage;