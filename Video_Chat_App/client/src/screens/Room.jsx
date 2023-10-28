import React, { useCallback, useEffect, useState } from "react";
import ReactPlayer from "react-player";
import { useSocket } from "../context/SocketProvider";
import peer from "../service/peer";

const Room = () => {
  const socket = useSocket();
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [myStream, setMyStream] = useState();
  const [remoteStream, setRemoteStream] = useState();

  const handleUserJoined = useCallback(({ email, id }) => {
    console.log(`Email ${email} joined room`);
    setRemoteSocketId(id);
  }, []);

  const handleIncomingCall = useCallback(
    async ({ from, offer }) => {
      setRemoteSocketId(from);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      setMyStream(stream);
      console.log(`Incoming Call`, from, offer);
      const ans = await peer.getAnswer(offer);
      socket.emit("call:accepted", { to: from, ans });
    },
    [socket]
  );

  const sendStreams = useCallback(() => {
    for (const track of myStream.getTracks()) {
        peer.peer.addTrack(track, myStream);
      }
  }, [myStream]);

  const handleCallAccepted = useCallback(
    ({ from, ans }) => {
      peer.setLocalDescription(ans);
      console.log("call Accepted");
      sendStreams();
      
    },
    [sendStreams]
  );

  const handleNegotiationNeeded = useCallback(async() => {
    const offer = await peer.getOffer();
    socket.emit('peer:nego:needed', {offer, to: remoteSocketId})
},[])

  useEffect(() => {
    peer.peer.addEventListener('negotiationNeeded', handleNegotiationNeeded);
    return () => {
        peer.peer.removeEventListener('negotiationNeeded', handleNegotiationNeeded)

    }
  }, [handleNegotiationNeeded]);

  const handleNegotiationIncomming =useCallback(async ({from, offer}) => {
const ans = await peer.getAnswer(offer);
socket.emit('peer:nego:done', {to: from, ans})
  },[socket]);

  const handleNegotiationFinal =useCallback(async(ans) => {
    await peer.setLocalDescription(ans)

  },[])

  useEffect(() => {
    peer.peer.addEventListener("track", async (ev) => {
      const remoteStream = ev.streams;
      setRemoteStream(remoteStream[0]);
    });
  }, []);

  useEffect(() => {
    socket.on("user:joined", handleUserJoined);
    socket.on("incoming:call", handleIncomingCall);
    socket.on("call-accepted", handleCallAccepted);
    socket.on("peer:nego:needed", handleNegotiationIncomming);
    socket.on('peer:nego:final', handleNegotiationFinal);


    return () => {
      socket.off("user:joined", handleUserJoined);
      socket.off("incoming:call", handleIncomingCall);
      socket.off("call-accepted", handleCallAccepted);
      socket.off("peer:nego:needed", handleNegotiationIncomming);
      socket.off('peer:nego:final', handleNegotiationFinal);

    };
  }, [socket, handleUserJoined, handleIncomingCall, handleCallAccepted, handleNegotiationIncomming, handleNegotiationFinal]);

  const handleCallUser = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    const offer = await peer.getOffer();
    socket.emit("user:call", { to: remoteSocketId, offer });
    setMyStream(stream);
  }, [remoteSocketId, socket]);
  return (
    <>
      <div>Room Page</div>
      <h4>{remoteSocketId ? "Connected" : "No one in room"} </h4>
      {
        myStream && <button onClick={sendStreams}>Send Stream</button>
      }
      {remoteSocketId && <button onClick={handleCallUser}>Call</button>}
      {myStream && (
        <>
          <h1>My Stream</h1>
          <ReactPlayer
            playing
            muted
            height="100px"
            width="200px"
            url={myStream}
          />
        </>
      )}
      {remoteStream && (
        <>
          <h1>Remote Stream</h1>
          <ReactPlayer
            playing
            muted
            height="100px"
            width="200px"
            url={remoteStream}
          />
        </>
      )}
    </>
  );
};

export default Room;
