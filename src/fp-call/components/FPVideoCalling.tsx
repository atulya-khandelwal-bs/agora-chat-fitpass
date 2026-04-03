import * as React from "react";
import AgoraRTC, {
  AgoraRTCProvider,
  IAgoraRTCClient,
  type ILocalAudioTrack,
  type ILocalTrack,
  type ILocalVideoTrack,
} from "agora-rtc-react";
import FPCallUI from "./FPCallUI";
import VirtualBackgroundExtension from "agora-extension-virtual-background";
import {
  useIsConnected,
  useJoin,
  usePublish,
  useRemoteUsers,
} from "agora-rtc-react";
import { useEffect, useMemo, useRef, useState } from "react";
import config from "../../common/config";
import { FPVideoCallingProps, BackgroundOption } from "../../common/types/call";
import { shouldProceedWithRemoteUsers } from "../../fp-chat/utils/blockedUIDs";

interface FPVideoCallingInnerProps extends FPVideoCallingProps {
  client: IAgoraRTCClient;
  peerPresenceStatus?: "offline" | "waiting" | "in_call" | null;
  localUserName?: string;
  localUserPhoto?: string;
  peerName?: string;
  peerAvatar?: string;
}

// Inner component that uses Agora hooks - must be wrapped by AgoraRTCProvider
const FPVideoCallingInner = ({
  userId,
  peerId: _peerId,
  channel: propChannel,
  isInitiator: _isInitiator,
  onEndCall,
  isAudioCall = false,
  client: _client,
  peerPresenceStatus,
  localUserName,
  localUserPhoto,
  peerName,
  peerAvatar,
}: FPVideoCallingInnerProps): React.JSX.Element => {
  // State management
  const [calling, setCalling] = useState<boolean>(false);
  const isConnected = useIsConnected();
  const isStandalone = !userId || !propChannel;
  const [appId, setAppId] = useState<string>(config.agora.rtcAppId);
  const [channel, setChannel] = useState<string>(propChannel || "second-time");
  const [token, setToken] = useState<string>("");

  // Generate UID from userId (convert string to number hash)
  const generateUidFromUserId = (userId: string): number => {
    const num = Number(userId);

    // Check validity and 32-bit signed int range
    if (Number.isInteger(num) && num >= -2147483648 && num <= 2147483647) {
      return num | 0; // force 32-bit signed int
    }

    // fallback random 32-bit signed integer
    return (Math.random() * 0x7fffffff) | 0;
    // if (!userId) return 0;
    // let hash = 0;
    // for (let i = 0; i < userId.length; i++) {
    //   const char = userId.charCodeAt(i);
    //   hash = (hash << 5) - hash + char;
    //   hash = hash & hash; // Convert to 32bit integer
    // }
    // return Math.abs(hash);
  };

  const initialUid = userId ? generateUidFromUserId(userId) : 0;
  const [uid, setUid] = useState<string | number>(initialUid);
  const [generatingToken, setGeneratingToken] = useState<boolean>(false);
  const [pendingJoin, setPendingJoin] = useState<boolean>(false);
  // Track if we've already attempted to join to prevent re-joining on re-renders
  const hasAttemptedJoinRef = useRef<boolean>(false);

  // Media controls state
  const [micOn, setMic] = useState<boolean>(true);
  const [cameraOn, setCamera] = useState<boolean>(!isAudioCall);
  const [virtualBackground, setVirtualBackground] = useState<boolean>(false);
  const [selectedBackground, setSelectedBackground] = useState<string | null>(
    null
  );
  const [showBackgroundOptions, setShowBackgroundOptions] =
    useState<boolean>(false);
  const [speakerOn, setSpeakerOn] = useState<boolean>(true);
  const [showMoreOptions, setShowMoreOptions] = useState<boolean>(false);
  const [useAgoraExtension, setUseAgoraExtension] = useState<boolean>(true);
  const [controlsVisible, setControlsVisible] = useState<boolean>(true);
  const [mainUserId, setMainUserId] = useState<number | null>(null);

  // Refs
  const hideControlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoContainerRef = useRef<HTMLDivElement | null>(null);
  const callingRef = useRef(calling);
  const cameraOnRef = useRef(cameraOn);
  const micOnRef = useRef(micOn);
  const isAudioCallRef = useRef(isAudioCall);
  callingRef.current = calling;
  cameraOnRef.current = cameraOn;
  micOnRef.current = micOn;
  isAudioCallRef.current = isAudioCall;
  const callStartTimeRef = useRef<number | null>(null);
  const remoteUserEverJoinedRef = useRef<boolean>(false);
  const processorRef = useRef<{
    setOptions?: (options: unknown) => Promise<void> | void;
    enable?: () => Promise<void> | void;
    disable?: () => Promise<void> | void;
    init?: () => Promise<void>;
    pipe?: (processor: unknown) => unknown;
  } | null>(null);
  const extensionRef = useRef<VirtualBackgroundExtension | null>(null);
  const loadedImagesRef = useRef<Map<string, HTMLImageElement>>(
    new Map()
  ); /*  */

  // Agora hooks
  // Manual microphone track: `useLocalMicrophoneTrack(ready)` only creates when `ready && !track` and
  // does not destroy when `ready` is false — the OS mic stays active. We create/destroy with `micOn`.
  const [localMicrophoneTrack, setLocalMicrophoneTrack] =
    useState<ILocalAudioTrack | null>(null);
  // Manual camera track: `useLocalCameraTrack(ready)` only creates when `ready && !track` and does
  // not destroy the track when `ready` becomes false — the OS camera stays on. We create/destroy
  // with `cameraOn` so "Stop video" releases the hardware and turning video on opens it again.
  const [localCameraTrack, setLocalCameraTrack] =
    useState<ILocalVideoTrack | null>(null);
  const allRemoteUsers = useRemoteUsers();

  // Helper function to stop MediaStreamTrack (system device)
  const stopMediaStreamTrack = (
    track: {
      getMediaStreamTrack?: () => MediaStreamTrack | null;
      getTrack?: () => MediaStreamTrack | null;
    } | null,
    trackName: string
  ): void => {
    if (!track) {
      console.log(`⚠️ No ${trackName} track to stop`);
      return;
    }

    try {
      // Get the underlying MediaStreamTrack
      let mediaStreamTrack: MediaStreamTrack | null = null;
      if (typeof track.getMediaStreamTrack === "function") {
        mediaStreamTrack = track.getMediaStreamTrack();
      } else if (typeof track.getTrack === "function") {
        mediaStreamTrack = track.getTrack();
      } else if ("track" in track && track.track instanceof MediaStreamTrack) {
        mediaStreamTrack = track.track as MediaStreamTrack;
      }

      // Stop the MediaStreamTrack to turn off system device
      if (mediaStreamTrack) {
        if (mediaStreamTrack.readyState !== "ended") {
          mediaStreamTrack.stop();
          console.log(
            `🛑 Stopped ${trackName} MediaStreamTrack (system device) - ID: ${mediaStreamTrack.id}`
          );
        } else {
          console.log(`⚠️ ${trackName} MediaStreamTrack already ended`);
        }
      } else {
        console.warn(
          `⚠️ Could not get MediaStreamTrack from ${trackName} track`
        );
      }
    } catch (error) {
      console.warn(`Error stopping ${trackName} MediaStreamTrack:`, error);
    }
  };

  // Comprehensive function to stop ALL video tracks from DOM elements
  // This ensures we catch any tracks that might not be in the Agora track objects
  const stopAllVideoTracksFromDOM = (): void => {
    try {
      let stoppedCount = 0;

      // Method 1: Get all video elements in the DOM
      const videoElements = document.querySelectorAll("video");
      videoElements.forEach((element) => {
        if (element instanceof HTMLVideoElement) {
          const stream = element.srcObject;
          if (stream instanceof MediaStream) {
            stream.getTracks().forEach((track) => {
              if (track.kind === "video" && track.readyState !== "ended") {
                track.stop();
                stoppedCount++;
                console.log(
                  `🛑 Stopped video MediaStreamTrack from DOM element - ID: ${track.id}, label: ${track.label}`
                );
              }
            });
            // Clear the srcObject to release the stream
            element.srcObject = null;
          }
        }
      });

      // Method 2: Try to access MediaStreamTrack directly from any active streams
      // This is a more aggressive approach
      if (
        navigator.mediaDevices &&
        typeof navigator.mediaDevices.getUserMedia === "function"
      ) {
        // We can't directly enumerate active streams, but we can check all video elements again
        // and also check if there are any active tracks in the browser's internal state
        const allElements = document.querySelectorAll("*");
        allElements.forEach((element) => {
          if (
            element instanceof HTMLVideoElement ||
            element instanceof HTMLCanvasElement
          ) {
            // Check if element has any associated streams
            if (element instanceof HTMLVideoElement && element.srcObject) {
              const stream = element.srcObject as MediaStream;
              if (stream instanceof MediaStream) {
                stream.getTracks().forEach((track) => {
                  if (track.kind === "video" && track.readyState === "live") {
                    track.stop();
                    stoppedCount++;
                    console.log(
                      `🛑 Stopped live video MediaStreamTrack - ID: ${track.id}, label: ${track.label}`
                    );
                  }
                });
                element.srcObject = null;
              }
            }
          }
        });
      }

      // Also try to enumerate devices to check for active video tracks
      // This is a fallback for tracks that might be active but not attached to elements
      if (
        navigator.mediaDevices &&
        typeof navigator.mediaDevices.enumerateDevices === "function"
      ) {
        // Enumerate all media devices to find active video tracks
        navigator.mediaDevices
          .enumerateDevices()
          .then((devices) => {
            const videoDevices = devices.filter(
              (device) => device.kind === "videoinput"
            );
            if (videoDevices.length > 0) {
              console.log(
                `ℹ️ Found ${videoDevices.length} video input device(s)`
              );
            }
          })
          .catch((err) => {
            console.warn("Error enumerating devices:", err);
          });
      }

      if (stoppedCount > 0) {
        console.log(
          `🛑 Stopped ${stoppedCount} video MediaStreamTrack(s) from DOM elements`
        );
      }
    } catch (error) {
      console.warn("Error stopping all video tracks from DOM:", error);
    }
  };

  // Stop microphone MediaStreamTracks still attached to <video>/<audio> in the call UI.
  // Local preview can leave an audio track live on a <video> element even after Agora track.close().
  const stopAllAudioTracksFromMediaElements = (root: ParentNode): void => {
    try {
      root.querySelectorAll("video, audio").forEach((node) => {
        if (
          node instanceof HTMLVideoElement ||
          node instanceof HTMLAudioElement
        ) {
          const stream = node.srcObject;
          if (stream instanceof MediaStream) {
            stream.getTracks().forEach((track) => {
              if (track.kind === "audio" && track.readyState !== "ended") {
                track.stop();
              }
            });
          }
          node.srcObject = null;
        }
      });
    } catch (error) {
      console.warn("Error stopping audio tracks from media elements:", error);
    }
  };

  const stopCaptureAudioInCallUI = (): void => {
    const shell = document.querySelector(".fp-video-calling-shell");
    if (shell) {
      stopAllAudioTracksFromMediaElements(shell);
    }
    if (videoContainerRef.current) {
      stopAllAudioTracksFromMediaElements(videoContainerRef.current);
    }
  };

  // Turn off system camera when user disables video or leaves; turn it on again when re-enabled.
  useEffect(() => {
    if (isAudioCall) return;

    if (!calling || !cameraOn) {
      if (!localCameraTrack) return;

      const track = localCameraTrack;
      let cancelled = false;

      void (async () => {
        try {
          if (cancelled) return;
          if (_client && isConnected) {
            try {
              await _client.unpublish([track]);
            } catch {
              /* already unpublished or leaving */
            }
          }
          if (cancelled) return;
          try {
            await processorRef.current?.disable?.();
          } catch {
            /* noop */
          }
          if (cancelled) return;
          try {
            if (typeof track.unpipe === "function") {
              track.unpipe();
            }
          } catch {
            /* noop */
          }
          if (cancelled) return;
          stopMediaStreamTrack(track, "camera");
          if (cancelled) return;
          try {
            track.close();
          } catch {
            /* already closed */
          }
        } finally {
          if (!cancelled) {
            setLocalCameraTrack((cur) => (cur === track ? null : cur));
          }
        }
      })();

      return () => {
        cancelled = true;
      };
    }

  }, [calling, isAudioCall, cameraOn, isConnected, _client, localCameraTrack]);

  useEffect(() => {
    if (isAudioCall || !calling || !cameraOn) return;
    if (localCameraTrack) return;

    let cancelled = false;
    void (async () => {
      try {
        const track = await AgoraRTC.createCameraVideoTrack();
        if (
          cancelled ||
          !callingRef.current ||
          !cameraOnRef.current ||
          isAudioCallRef.current
        ) {
          track.close();
          return;
        }
        setLocalCameraTrack(track);
      } catch (err) {
        console.error("Failed to open camera:", err);
        if (!cancelled) {
          setCamera(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [calling, isAudioCall, cameraOn, localCameraTrack]);

  // Turn off system microphone when user mutes or leaves; turn on again when unmuted.
  useEffect(() => {
    if (!calling || !micOn) {
      if (!localMicrophoneTrack) return;

      const track = localMicrophoneTrack;
      let cancelled = false;

      void (async () => {
        try {
          if (cancelled) return;
          if (_client && isConnected) {
            try {
              await _client.unpublish([track]);
            } catch {
              /* already unpublished or leaving */
            }
          }
          if (cancelled) return;
          try {
            if (typeof track.setAudioFrameCallback === "function") {
              track.setAudioFrameCallback(null);
            }
          } catch {
            /* noop */
          }
          if (cancelled) return;
          try {
            if (typeof track.unpipe === "function") {
              track.unpipe();
            }
          } catch {
            /* noop */
          }
          if (cancelled) return;
          stopMediaStreamTrack(track, "microphone");
          if (cancelled) return;
          try {
            track.close();
          } catch {
            /* already closed */
          }
        } finally {
          if (!cancelled) {
            setLocalMicrophoneTrack((cur) => (cur === track ? null : cur));
          }
        }
      })();

      return () => {
        cancelled = true;
      };
    }
  }, [calling, micOn, isConnected, _client, localMicrophoneTrack]);

  useEffect(() => {
    if (!calling || !micOn) return;
    if (localMicrophoneTrack) return;

    let cancelled = false;
    void (async () => {
      try {
        const track = await AgoraRTC.createMicrophoneAudioTrack({
          ANS: true,
          AEC: true,
        });
        if (cancelled || !callingRef.current || !micOnRef.current) {
          track.close();
          return;
        }
        setLocalMicrophoneTrack(track);
      } catch (err) {
        console.error("Failed to open microphone:", err);
        if (!cancelled) {
          setMic(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [calling, micOn, localMicrophoneTrack]);

  // Filter out blocked UIDs (Recorder and RTST Agent) - ignore all events for these users
  const remoteUsers = allRemoteUsers.filter((user) => {
    return shouldProceedWithRemoteUsers(user.uid);
  });

  console.log("remoteUsers", remoteUsers);

  // Log all connected users details
  useEffect(() => {
    if (isConnected && calling) {
      const localUserDetails = {
        userId: userId,
        uid: typeof uid === "number" ? uid : parseInt(String(uid), 10),
        name: localUserName || userId,
        photo: localUserPhoto || null,
        hasAudio: localMicrophoneTrack ? true : false,
        hasVideo: localCameraTrack ? true : false,
        micOn: micOn,
        cameraOn: cameraOn,
        isLocal: true,
      };

      const remoteUsersDetails = remoteUsers.map((user) => ({
        uid:
          typeof user.uid === "number"
            ? user.uid
            : parseInt(String(user.uid), 10),
        hasAudio: user.hasAudio || false,
        hasVideo: user.hasVideo || false,
        audioTrack: user.audioTrack ? "present" : "absent",
        videoTrack: user.videoTrack ? "present" : "absent",
        isLocal: false,
      }));

      console.log("📞 === CALL CONNECTION DETAILS ===");
      console.log("Local User:", localUserDetails);
      console.log("Remote Users:", remoteUsersDetails);
      console.log("Total Users in Call:", 1 + remoteUsers.length);
      console.log("Channel:", channel);
      console.log("Is Connected:", isConnected);
      console.log("Calling State:", calling);
      console.log("===================================");
    }
  }, [
    isConnected,
    calling,
    userId,
    uid,
    localUserName,
    localUserPhoto,
    localMicrophoneTrack,
    localCameraTrack,
    micOn,
    cameraOn,
    remoteUsers,
    channel,
  ]);

  // Background options
  const backgroundOptions: BackgroundOption[] = [
    { id: "blur", name: "Blur", type: "blur" },
    {
      id: "office",
      name: "Office",
      type: "image",
      url: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop",
    },
    {
      id: "nature",
      name: "Nature",
      type: "image",
      url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop",
    },
    {
      id: "space",
      name: "Space",
      type: "image",
      url: "https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=800&h=600&fit=crop",
    },
    {
      id: "beach",
      name: "Beach",
      type: "image",
      url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop",
    },
    {
      id: "city",
      name: "City",
      type: "image",
      url: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&h=600&fit=crop",
    },
  ];

  // Register virtual background extension for video calls
  useEffect(() => {
    if (!isAudioCall) {
      const extension = new VirtualBackgroundExtension();
      if (!extension.checkCompatibility()) {
        console.error("Does not support Virtual Background!");
      }
      AgoraRTC.registerExtensions([extension]);
      extensionRef.current = extension;
    }
  }, [isAudioCall]);

  // Suppress Agora analytics errors
  useEffect(() => {
    const originalError = console.error;
    const originalWarn = console.warn;

    const isAgoraAnalyticsError = (message: unknown): boolean => {
      if (typeof message === "string") {
        return (
          message.includes("statscollector") ||
          message.includes("ERR_CONNECTION_RESET") ||
          message.includes("events/messages") ||
          message.includes("net::ERR_CONNECTION_RESET")
        );
      }
      return false;
    };

    const errorHandler = (message: unknown, ...args: unknown[]): void => {
      if (
        isAgoraAnalyticsError(message) ||
        (args.length > 0 &&
          typeof args[0] === "string" &&
          isAgoraAnalyticsError(args[0]))
      ) {
        return;
      }
      originalError(message, ...args);
    };

    const warnHandler = (message: unknown, ...args: unknown[]): void => {
      if (
        isAgoraAnalyticsError(message) ||
        (args.length > 0 &&
          typeof args[0] === "string" &&
          isAgoraAnalyticsError(args[0]))
      ) {
        return;
      }
      originalWarn(message, ...args);
    };

    console.error = errorHandler;
    console.warn = warnHandler;

    const handleRejection = (event: PromiseRejectionEvent): void => {
      const reason = event.reason?.message || event.reason?.toString() || "";
      if (isAgoraAnalyticsError(reason)) {
        event.preventDefault();
      }
    };

    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  // Track call start time
  useEffect(() => {
    if (isConnected && !callStartTimeRef.current) {
      callStartTimeRef.current = Date.now();
      console.log("Call started at:", new Date(callStartTimeRef.current));
    }
  }, [isConnected]);

  // Track previous calling state to detect call end
  const prevCallingRef = useRef<boolean>(calling);

  // Stop system camera and mic when call ends (calling becomes false)
  useEffect(() => {
    // When calling changes from true to false, stop the system devices
    if (prevCallingRef.current && !calling) {
      console.log(
        "🛑 Call ended (calling=false), stopping system camera and microphone"
      );
      stopMediaStreamTrack(localCameraTrack, "camera");
      stopMediaStreamTrack(localMicrophoneTrack, "microphone");

      // Comprehensive fallback: Stop ALL video tracks from DOM
      stopAllVideoTracksFromDOM();
      stopCaptureAudioInCallUI();

      // Also close the Agora tracks to fully release resources
      try {
        if (localCameraTrack && typeof localCameraTrack.close === "function") {
          localCameraTrack.close();
          console.log("🛑 Closed camera Agora track");
        }
        if (
          localMicrophoneTrack &&
          typeof localMicrophoneTrack.close === "function"
        ) {
          localMicrophoneTrack.close();
          console.log("🛑 Closed microphone Agora track");
        }
      } catch (error) {
        console.warn("Error closing tracks:", error);
      }

      // Additional cleanup after a delay
      setTimeout(() => {
        stopAllVideoTracksFromDOM();
        stopCaptureAudioInCallUI();
      }, 200);
    }
    prevCallingRef.current = calling;
  }, [calling, localCameraTrack, localMicrophoneTrack]);

  // Cleanup on component unmount - stop all tracks
  // Only clean up when component is truly unmounting, not when tracks change
  useEffect(() => {
    return () => {
      // Only clean up if call has ended (calling is false) or component is unmounting
      // Don't clean up during remounts when call is still active
      if (calling) {
        console.log(
          "⚠️ Component remounting during active call, preserving tracks"
        );
        return;
      }

      console.log(
        "🛑 Component unmounting, stopping system camera and microphone"
      );
      stopMediaStreamTrack(localCameraTrack, "camera");
      stopMediaStreamTrack(localMicrophoneTrack, "microphone");

      // Comprehensive fallback: Stop ALL video tracks from DOM
      stopAllVideoTracksFromDOM();
      stopCaptureAudioInCallUI();

      // Also close the Agora tracks
      try {
        if (localCameraTrack && typeof localCameraTrack.close === "function") {
          localCameraTrack.close();
        }
        if (
          localMicrophoneTrack &&
          typeof localMicrophoneTrack.close === "function"
        ) {
          localMicrophoneTrack.close();
        }
      } catch (error) {
        console.warn("Error closing tracks on unmount:", error);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run on true unmount

  // Handle remote user events and subscribe to their tracks
  useEffect(() => {
    if (!_client) return;

    // Ignore user-joined event for blocked UIDs
    const handleUserJoined = (user: { uid: string | number }): void => {
      if (!shouldProceedWithRemoteUsers(user.uid)) {
        console.log("Ignoring blocked UID join event:", user.uid);
        return;
      }
      console.log("✅ Remote user joined:", user.uid);
    };

    // Ignore user-left event for blocked UIDs
    const handleUserLeft = (user: { uid: string | number }): void => {
      if (!shouldProceedWithRemoteUsers(user.uid)) {
        console.log("Ignoring blocked UID leave event:", user.uid);
        return;
      }
      console.log("❌ Remote user left:", user.uid);
    };

    // Subscribe to remote user tracks when they publish (critical for seeing/hearing remote users)
    const handleUserPublished = async (
      user: { uid: string | number; hasAudio?: boolean; hasVideo?: boolean },
      mediaType: "audio" | "video"
    ): Promise<void> => {
      if (!shouldProceedWithRemoteUsers(user.uid)) {
        console.log("Ignoring blocked UID published event:", user.uid);
        return;
      }

      try {
        console.log(`📡 Remote user published ${mediaType}:`, user.uid);
        // Subscribe to the remote user's tracks using UID
        await _client.subscribe(user.uid, mediaType);
        console.log(
          `✅ Successfully subscribed to ${mediaType} for user:`,
          user.uid
        );
      } catch (error) {
        console.error(
          `❌ Error subscribing to ${mediaType} for user ${user.uid}:`,
          error
        );
      }
    };

    // Handle user-unpublished event for blocked UIDs (mute/unmute)
    const handleUserUnpublished = (user: { uid: string | number }): void => {
      if (!shouldProceedWithRemoteUsers(user.uid)) {
        console.log("Ignoring blocked UID unpublished event:", user.uid);
        return;
      }
      console.log("🔇 Remote user unpublished:", user.uid);
    };

    // Add event listeners
    _client.on("user-joined", handleUserJoined);
    _client.on("user-left", handleUserLeft);
    _client.on("user-published", handleUserPublished);
    _client.on("user-unpublished", handleUserUnpublished);

    // Cleanup
    return () => {
      _client.off("user-joined", handleUserJoined);
      _client.off("user-left", handleUserLeft);
      _client.off("user-published", handleUserPublished);
      _client.off("user-unpublished", handleUserUnpublished);
    };
  }, [_client]);

  // Track if remote user ever joined (excluding recorder)
  useEffect(() => {
    if (remoteUsers.length > 0) {
      remoteUserEverJoinedRef.current = true;
      console.log("Remote user joined. Both users are connected.");
    }
  }, [remoteUsers.length]);

  // Reset mainUserId when number of users changes
  useEffect(() => {
    if (remoteUsers.length !== 1) {
      setMainUserId(null);
    } else if (mainUserId !== null) {
      const userExists = remoteUsers.some((user) => user.uid === mainUserId);
      if (!userExists) {
        setMainUserId(null);
      }
    }
  }, [remoteUsers.length, mainUserId, remoteUsers]);

  // Preload background images
  useEffect(() => {
    const preloadImages = async () => {
      for (const bg of backgroundOptions) {
        if (bg.type === "image" && bg.url) {
          try {
            const img = new Image();
            img.crossOrigin = "anonymous";
            await new Promise<HTMLImageElement>((resolve, reject) => {
              img.onload = () => {
                loadedImagesRef.current.set(bg.id, img);
                console.log(`Preloaded image for ${bg.name}`);
                resolve(img);
              };
              img.onerror = reject;
              if (bg.url) {
                img.src = bg.url;
              } else {
                reject(new Error("No URL provided"));
              }
            });
          } catch (error) {
            console.error(`Failed to preload image for ${bg.name}:`, error);
          }
        }
      }
    };
    preloadImages();
  }, []);

  // Setup virtual background processor
  useEffect(() => {
    if (!localCameraTrack || isAudioCall) return;

    const setupVirtualBackground = async () => {
      try {
        if (!extensionRef.current) {
          const ext = new VirtualBackgroundExtension();
          AgoraRTC.registerExtensions([ext]);
          extensionRef.current = ext;
        }

        if (!processorRef.current && extensionRef.current) {
          const processor = extensionRef.current.createProcessor();
          processorRef.current = processor as unknown as {
            setOptions?: (options: unknown) => Promise<void> | void;
            enable?: () => Promise<void> | void;
            disable?: () => Promise<void> | void;
            init?: () => Promise<void>;
            pipe?: (processor: unknown) => unknown;
          } | null;
          if (processorRef.current?.init) {
            await processorRef.current.init();
          }
        }

        if (processorRef.current && localCameraTrack.pipe) {
          // Type assertion needed for Agora SDK processor
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          localCameraTrack
            .pipe(processorRef.current as any)
            .pipe(localCameraTrack.processorDestination);
        }
      } catch (err) {
        console.error("Error setting up virtual background:", err);
      }
    };

    setupVirtualBackground();
  }, [localCameraTrack, isAudioCall]);

  // Enable/disable background effect dynamically
  useEffect(() => {
    const updateBackground = async () => {
      if (!processorRef.current && useAgoraExtension) return;

      try {
        if (virtualBackground && selectedBackground) {
          if (useAgoraExtension && processorRef.current) {
            let options: {
              type: string;
              blurDegree?: number;
              source?: HTMLImageElement | string;
            } = { type: "blur" };

            if (selectedBackground === "blur") {
              options = {
                type: "blur",
                blurDegree: 2,
              };
            } else if (selectedBackground) {
              const bg = backgroundOptions.find(
                (bg) => bg.id === selectedBackground
              );
              if (bg?.type === "image") {
                const preloadedImg =
                  loadedImagesRef.current.get(selectedBackground);
                if (preloadedImg) {
                  options = {
                    type: "img",
                    source: preloadedImg,
                  };
                  console.log("Using preloaded image for background");
                } else {
                  console.warn(
                    "Preloaded image not found, falling back to URL"
                  );
                  if (bg.url) {
                    options = {
                      type: "img",
                      source: bg.url,
                    };
                  }
                }
              }
            }

            console.log("Setting background options:", options);
            if (processorRef.current?.setOptions) {
              await processorRef.current.setOptions(options as unknown);
              if (processorRef.current.enable) {
                await processorRef.current.enable();
              }
            }
          }
        } else {
          console.log("Disabling virtual background");
          if (useAgoraExtension && processorRef.current?.disable) {
            await processorRef.current.disable();
          }
        }
      } catch (error) {
        console.error("Error updating background:", error);
        if (useAgoraExtension) {
          console.log("Agora extension failed, falling back to CSS approach");
          setUseAgoraExtension(false);
        }
      }
    };

    updateBackground();
  }, [virtualBackground, selectedBackground, useAgoraExtension]);

  // Auto-hide controls on mobile
  useEffect(() => {
    if (!isConnected || !videoContainerRef.current) return;

    const isMobile = window.innerWidth <= 768;
    if (!isMobile) return;

    const container = videoContainerRef.current;

    const resetTimer = () => {
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current);
      }
      setControlsVisible(true);
      hideControlsTimerRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 10000);
    };

    resetTimer();

    const handleUserInteraction = (e: Event): void => {
      const target = e.target as HTMLElement | null;
      if (target?.closest(".control-bar") || target?.closest(".call-header")) {
        resetTimer();
        return;
      }
      resetTimer();
    };

    container.addEventListener("click", handleUserInteraction);
    container.addEventListener("touchstart", handleUserInteraction);
    container.addEventListener("mousemove", handleUserInteraction);

    return () => {
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current);
      }
      container.removeEventListener("click", handleUserInteraction);
      container.removeEventListener("touchstart", handleUserInteraction);
      container.removeEventListener("mousemove", handleUserInteraction);
    };
  }, [isConnected]);

  // Agora join and publish hooks
  useJoin(
    {
      appid: appId,
      channel,
      token: token || null,
      uid: String(uid),
    },
    calling
  );
  // Only publish tracks that are not null and the call is active
  // Use useMemo to stabilize the array reference and prevent unnecessary unpublish/republish cycles
  // CRITICAL: Only publish when call is active AND connected to prevent track from being stopped
  const tracksToPublish = useMemo(() => {
    // Don't publish if call is not active or not connected - this prevents tracks from being stopped
    if (!calling || !isConnected) {
      return [];
    }

    if (isAudioCall) {
      return localMicrophoneTrack ? [localMicrophoneTrack] : [];
    }
    const list: ILocalTrack[] = [];
    if (localMicrophoneTrack) {
      list.push(localMicrophoneTrack);
    }
    // usePublish does not unpublish tracks removed from this array — camera teardown unpublishes before close.
    if (cameraOn && localCameraTrack) {
      list.push(localCameraTrack);
    }
    return list;
  }, [
    isAudioCall,
    localMicrophoneTrack,
    localCameraTrack,
    cameraOn,
    calling,
    isConnected,
  ]);
  usePublish(tracksToPublish);

  // Mic track only exists while micOn; ensure published track is sending after connect.
  useEffect(() => {
    if (!localMicrophoneTrack || !calling || !micOn || !isConnected) return;
    try {
      if (typeof localMicrophoneTrack.setMuted === "function") {
        localMicrophoneTrack.setMuted(false);
      }
      if (typeof localMicrophoneTrack.setEnabled === "function") {
        localMicrophoneTrack.setEnabled(true);
      }
      if (typeof localMicrophoneTrack.setVolume === "function") {
        localMicrophoneTrack.setVolume(100);
      }
    } catch (error) {
      console.warn("Error configuring microphone after open:", error);
    }
  }, [localMicrophoneTrack, calling, micOn, isConnected]);

  // Generate token from API
  const generateToken = async (): Promise<string | null> => {
    if (!channel || typeof uid !== "number") {
      if (!isStandalone) {
        console.error("Cannot generate token: missing channel or UID");
      } else {
        alert("Please enter channel name and UID");
      }
      return null;
    }
    setGeneratingToken(true);
    try {
      const response = await fetch(config.rtcToken.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channelName: channel,
          username: String(userId || uid),
          expireInSecs: 7200,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate token: ${response.statusText}`);
      }

      const data = (await response.json()) as { token?: string };
      if (data.token) {
        const newToken = data.token;
        setToken(newToken);
        console.log(
          "Token generated successfully:",
          newToken.substring(0, 50) + "..."
        );
        return newToken;
      } else {
        throw new Error("Token not found in response");
      }
    } catch (error) {
      console.error("Error generating token:", error);
      alert(
        `Failed to generate token: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      return null;
    } finally {
      setGeneratingToken(false);
    }
  };

  // Handle join call
  const handleJoinCall = async (): Promise<void> => {
    if (!token && channel && typeof uid === "number") {
      setPendingJoin(true);
      const generatedToken = await generateToken();
      if (!generatedToken) {
        setPendingJoin(false);
        alert("Failed to generate token. Cannot join call.");
        return;
      }
    } else if (token) {
      setCalling(true);
    } else {
      alert("Token is required to join the call");
    }
  };

  // Auto-join when props are provided - only run once to prevent re-joining on re-renders
  useEffect(() => {
    // Prevent re-running if we've already attempted to join or if conditions aren't met
    if (
      hasAttemptedJoinRef.current ||
      isStandalone ||
      !propChannel ||
      !userId ||
      calling ||
      token ||
      pendingJoin ||
      typeof uid !== "number" ||
      uid <= 0
    ) {
      return;
    }

    console.log("Auto-joining call with props:", {
      channel: propChannel,
      userId: userId,
      uid: uid,
    });

    hasAttemptedJoinRef.current = true;
    const autoJoin = async () => {
      setPendingJoin(true);
      const generatedToken = await generateToken();
      if (generatedToken) {
        setToken(generatedToken);
      } else {
        setPendingJoin(false);
        hasAttemptedJoinRef.current = false; // Reset on failure to allow retry
        console.error("Failed to auto-generate token");
      }
    };
    autoJoin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStandalone, propChannel, userId, uid, calling, token, pendingJoin]);

  // Handle join when token is ready
  useEffect(() => {
    if (pendingJoin && token) {
      console.log(
        "Token ready, joining call with token:",
        token.substring(0, 50) + "..."
      );
      console.log("App ID:", appId);
      console.log("Channel:", channel);
      console.log("UID:", uid);
      setPendingJoin(false);
      setTimeout(() => {
        console.log("Setting calling to true...");
        setCalling(true);
      }, 300);
    }
  }, [token, pendingJoin, appId, channel, uid]);

  // Close more options menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      const target = event.target as HTMLElement | null;
      if (
        !target?.closest(".more-options-menu") &&
        !target?.closest(".more-options-button")
      ) {
        setShowMoreOptions(false);
      }
    };

    if (showMoreOptions) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showMoreOptions]);

  // Handlers
  const handleBackgroundSelect = (background: BackgroundOption): void => {
    console.log("Background selected:", background);
    setSelectedBackground(background.id);
    setVirtualBackground(true);
    setShowBackgroundOptions(false);
  };

  const toggleVirtualBackground = (): void => {
    if (!virtualBackground) {
      setVirtualBackground(true);
      setSelectedBackground("blur");
    } else {
      setVirtualBackground(false);
      setSelectedBackground(null);
    }
  };

  const handleEndCall = async (): Promise<void> => {
    console.log("🛑 Call ending, stopping system camera and microphone");

    // Capture Agora track refs before changing `calling` (hooks still hold current tracks this tick).
    const currentCameraTrack = localCameraTrack;
    const currentMicTrack = localMicrophoneTrack;

    // Virtual background pipes the camera through a processor; disable + unpipe first so the
    // underlying camera MediaStreamTrack can fully stop (otherwise the OS camera may stay on).
    if (!isAudioCall) {
      try {
        await processorRef.current?.disable?.();
      } catch (error) {
        console.warn("Error disabling virtual background on end call:", error);
      }
      try {
        if (
          currentCameraTrack &&
          typeof currentCameraTrack.unpipe === "function"
        ) {
          currentCameraTrack.unpipe();
        }
      } catch (error) {
        console.warn("Error unpiping camera track on end call:", error);
      }
    }

    // Tear down local audio pipeline (processors) so the mic MediaStreamTrack can fully stop.
    try {
      if (
        currentMicTrack &&
        typeof currentMicTrack.setAudioFrameCallback === "function"
      ) {
        currentMicTrack.setAudioFrameCallback(null);
      }
    } catch (error) {
      console.warn("Error clearing audio frame callback on end call:", error);
    }
    try {
      if (currentMicTrack && typeof currentMicTrack.unpipe === "function") {
        currentMicTrack.unpipe();
      }
    } catch (error) {
      console.warn("Error unpiping microphone track on end call:", error);
    }

    // Unpublish while tracks are still valid so the SDK releases encoders/capture before we close.
    if (_client && isConnected) {
      const toUnpublish: ILocalTrack[] = [];
      if (currentCameraTrack && !isAudioCall) {
        toUnpublish.push(currentCameraTrack);
      }
      if (currentMicTrack) {
        toUnpublish.push(currentMicTrack);
      }
      if (toUnpublish.length > 0) {
        try {
          await _client.unpublish(toUnpublish);
        } catch (error) {
          console.warn("Error unpublishing local tracks on end call:", error);
        }
      }
    }

    setVirtualBackground(false);
    setSelectedBackground(null);

    // Stop creating tracks on next render
    setCalling(false);
    setCamera(false);

    // Stop MediaStreamTracks immediately (turns off system devices)
    stopMediaStreamTrack(currentCameraTrack, "camera");
    stopMediaStreamTrack(currentMicTrack, "microphone");

    // Comprehensive fallback: Stop ALL video tracks from DOM elements
    // This catches any tracks that might not be in the Agora track objects
    stopAllVideoTracksFromDOM();
    stopCaptureAudioInCallUI();

    // Also close the Agora tracks to fully release resources
    try {
      if (
        currentCameraTrack &&
        typeof currentCameraTrack.close === "function"
      ) {
        currentCameraTrack.close();
        console.log("🛑 Closed camera Agora track");
      }
      if (currentMicTrack && typeof currentMicTrack.close === "function") {
        currentMicTrack.close();
        console.log("🛑 Closed microphone Agora track");
      }
    } catch (error) {
      console.warn("Error closing tracks:", error);
    }

    if (!isAudioCall) {
      setLocalCameraTrack(null);
    }
    setLocalMicrophoneTrack(null);

    // Multiple cleanup passes to ensure all tracks are stopped
    // Pass 1: Immediate cleanup
    setTimeout(() => {
      console.log("🛑 Cleanup pass 1: stopping any remaining video/audio capture");
      stopAllVideoTracksFromDOM();
      stopCaptureAudioInCallUI();
      stopMediaStreamTrack(currentCameraTrack, "camera");
      stopMediaStreamTrack(currentMicTrack, "microphone");
    }, 50);

    // Pass 2: Delayed cleanup to catch any tracks created during transition
    setTimeout(() => {
      console.log("🛑 Cleanup pass 2: final cleanup of video/audio capture");
      stopAllVideoTracksFromDOM();
      stopCaptureAudioInCallUI();
      stopMediaStreamTrack(currentMicTrack, "microphone");
    }, 200);

    // Pass 3: Final cleanup after a longer delay
    setTimeout(() => {
      console.log("🛑 Cleanup pass 3: final verification");
      stopAllVideoTracksFromDOM();
      stopCaptureAudioInCallUI();
      stopMediaStreamTrack(currentMicTrack, "microphone");
    }, 500);

    if (onEndCall) {
      const callEndTime = Date.now();
      const callStartTime = callStartTimeRef.current;
      const duration = callStartTime
        ? Math.floor((callEndTime - callStartTime) / 1000)
        : 0;
      const bothUsersConnected = remoteUserEverJoinedRef.current;

      console.log("Ending call with:", {
        duration,
        bothUsersConnected,
        callStartTime: callStartTime ? new Date(callStartTime) : null,
        callEndTime: new Date(callEndTime),
      });

      onEndCall({
        duration,
        bothUsersConnected,
        callStartTime,
        callEndTime,
      });

      callStartTimeRef.current = null;
      remoteUserEverJoinedRef.current = false;
    }
  };

  return (
    <div className="fp-video-calling-shell">
      <FPCallUI
        // Connection state
        isConnected={isConnected}
        isStandalone={isStandalone}
        calling={calling}
        // Media tracks
        localMicrophoneTrack={localMicrophoneTrack}
        localCameraTrack={localCameraTrack}
        remoteUsers={remoteUsers}
        // Media controls
        micOn={micOn}
        setMic={setMic}
        cameraOn={cameraOn}
        setCamera={setCamera}
        speakerOn={speakerOn}
        setSpeakerOn={setSpeakerOn}
        // Virtual background
        virtualBackground={virtualBackground}
        selectedBackground={selectedBackground}
        showBackgroundOptions={showBackgroundOptions}
        setShowBackgroundOptions={setShowBackgroundOptions}
        useAgoraExtension={useAgoraExtension}
        backgroundOptions={backgroundOptions}
        toggleVirtualBackground={toggleVirtualBackground}
        handleBackgroundSelect={handleBackgroundSelect}
        // UI state
        showMoreOptions={showMoreOptions}
        setShowMoreOptions={setShowMoreOptions}
        controlsVisible={controlsVisible}
        setControlsVisible={setControlsVisible}
        mainUserId={mainUserId}
        setMainUserId={setMainUserId}
        // Refs
        videoContainerRef={videoContainerRef}
        hideControlsTimerRef={hideControlsTimerRef}
        // Standalone mode props
        appId={appId}
        setAppId={setAppId}
        channel={channel}
        setChannel={setChannel}
        uid={uid}
        setUid={setUid}
        token={token}
        setToken={setToken}
        generatingToken={generatingToken}
        generateToken={generateToken}
        handleJoinCall={handleJoinCall}
        // Other props
        isAudioCall={isAudioCall}
        onEndCall={handleEndCall}
        peerPresenceStatus={peerPresenceStatus}
        // User info
        localUserId={userId}
        localUserName={localUserName}
        localUserPhoto={localUserPhoto}
        peerName={peerName}
        peerAvatar={peerAvatar}
      />
    </div>
  );
};

// Outer component that creates client and wraps with provider
export const FPVideoCalling = ({
  userId,
  peerId,
  channel: propChannel,
  isInitiator,
  onEndCall,
  isAudioCall = false,
  peerPresenceStatus,
  localUserName,
  localUserPhoto,
  peerName,
  peerAvatar,
}: FPVideoCallingProps): React.JSX.Element => {
  // Create Agora client
  const client = AgoraRTC.createClient({
    mode: "rtc",
    codec: "vp8",
  });

  return (
    <AgoraRTCProvider client={client}>
      <FPVideoCallingInner
        userId={userId}
        peerId={peerId}
        channel={propChannel}
        isInitiator={isInitiator}
        onEndCall={onEndCall}
        isAudioCall={isAudioCall}
        client={client}
        peerPresenceStatus={peerPresenceStatus}
        localUserName={localUserName}
        localUserPhoto={localUserPhoto}
        peerName={peerName}
        peerAvatar={peerAvatar}
      />
    </AgoraRTCProvider>
  );
};
