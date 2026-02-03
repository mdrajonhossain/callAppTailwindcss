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

  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerConnection = useRef();
  const pendingCandidates = useRef([]);
  const channelRef = useRef(null);

  useEffect(() => {
    // 1. Get current user
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
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
      }
    });

    // 3. Subscribe to signaling channel
    const channel = supabase.channel("video-call-signaling");
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "signal" }, (payload) => {
        handleSignal(payload.payload);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
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
        break;
      case "answer":
        if (peerConnection.current) {
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
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      {/* Dashboard Card */}
      <div className="w-full max-w-4xl bg-white shadow-md rounded-lg flex flex-col h-[80vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0">
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

        {/* Incoming Call Alert */}
        {incomingCall && !callActive && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 m-4 flex justify-between items-center">
            <p className="font-bold">Incoming Call from {incomingCall.callerName}</p>
            <div className="flex gap-2">
              <button
                onClick={answerCall}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
              >
                Answer
              </button>
              <button
                onClick={() => setIncomingCall(null)}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
              >
                Reject
              </button>
            </div>
          </div>
        )}

        {/* Video Call Area */}
        {callActive && (
          <div className="flex-1 bg-black relative">
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
              className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition"
            >
              {/* Left: Avatar + Name */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold">
                    {user.full_name ? user.full_name.charAt(0) : "U"}
                  </div>
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