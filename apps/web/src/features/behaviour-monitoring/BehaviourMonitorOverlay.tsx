
import { useEffect, useRef, useState } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

const DEEPFACE_API = 'http://127.0.0.1:8010';
const STORAGE_KEY = 'mathquest:camera-session:v1';

type CameraObservation = {
  at: number;
  faceVisible: boolean;
  headPositionProxy: number;
  smile: number | null;
  blink: number | null;
  jawOpen: number | null;
  deepfaceExpression?: string;
};

type Props = {
  activityId: string;
  initialStream?: MediaStream | null;
};

export function BehaviourMonitorOverlay({
  activityId,
  initialStream,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ownsStreamRef = useRef(false);
  const modelRef = useRef<FaceLandmarker | null>(null);

  const frameRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const generationRef = useRef(0);

  const lastMediaPipeRef = useRef(0);
  const lastDeepFaceRef = useRef(0);
  const pendingRef = useRef(false);
  const deepFaceAvailableRef = useRef(true);

  const observationsRef = useRef<CameraObservation[]>([]);
  const sessionIdRef = useRef(crypto.randomUUID());

  const [status, setStatus] = useState<
    'off' | 'loading' | 'on' | 'error'
  >('off');

  const [faceVisible, setFaceVisible] = useState(false);
  const [message, setMessage] = useState('');

  function save() {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          sessionId: sessionIdRef.current,
          activityId,
          updatedAt: Date.now(),
          observations: observationsRef.current.slice(-1000),
        })
      );
    } catch (error) {
      console.warn('Could not store camera observations', error);
    }
  }

  function stop() {
    generationRef.current += 1;
    runningRef.current = false;

    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    if (ownsStreamRef.current) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    }

    streamRef.current = null;
    ownsStreamRef.current = false;

    modelRef.current?.close();
    modelRef.current = null;

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    pendingRef.current = false;
    setFaceVisible(false);
  }

  useEffect(() => {
    if (initialStream?.active) {
      void start(initialStream);
    } else {
      stop();
      setStatus('off');
      setMessage('කැමරාව සක්‍රීය කරන්න');
    }

    return () => {
      stop();
    };

    // Stream changes control initialization.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialStream]);

  async function analyzeExpression(
    video: HTMLVideoElement,
    generation: number
  ) {
    if (
      pendingRef.current ||
      !runningRef.current ||
      !deepFaceAvailableRef.current
    ) {
      return;
    }

    pendingRef.current = true;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;

      const context = canvas.getContext('2d');

      if (!context) return;

      context.drawImage(video, 0, 0, 320, 240);

      const imageBase64 = canvas
        .toDataURL('image/jpeg', 0.65)
        .split(',')[1];

      const response = await fetch(`${DEEPFACE_API}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          imageBase64,
        }),
      });

      if (!response.ok) {
        throw new Error(`DeepFace HTTP ${response.status}`);
      }

      const data: {
        faceDetected?: boolean;
        dominant?: string;
      } = await response.json();

      if (
        generation !== generationRef.current ||
        !runningRef.current
      ) {
        return;
      }

      if (data.faceDetected && data.dominant) {
        observationsRef.current.push({
          at: Date.now(),
          faceVisible: true,
          headPositionProxy: 0,
          smile: null,
          blink: null,
          jawOpen: null,
          deepfaceExpression: data.dominant,
        });

        if (observationsRef.current.length > 1000) {
          observationsRef.current.shift();
        }

        save();
      }
    } catch (error) {
      // Do not repeatedly request an unavailable optional service.
      deepFaceAvailableRef.current = false;

      console.warn(
        'Optional DeepFace analysis unavailable. MediaPipe continues.',
        error
      );
    } finally {
      pendingRef.current = false;
    }
  }

  async function start(existingStream?: MediaStream) {
    // Invalidate any earlier initialization attempt.
    stop();

    const generation = generationRef.current;

    setStatus('loading');
    setMessage('කැමරාව සූදානම් කරමින්...');

    let stream: MediaStream | null = null;
    let ownsStream = false;
    let model: FaceLandmarker | null = null;

    try {
      if (existingStream?.active) {
        stream = existingStream;
      } else if (existingStream) {
        throw new Error('The supplied camera stream is no longer active');
      } else {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: 640,
            height: 480,
          },
          audio: false,
        });

        ownsStream = true;
      }

      if (generation !== generationRef.current) {
        if (ownsStream) {
          stream.getTracks().forEach((track) => track.stop());
        }
        return;
      }

      const video = videoRef.current;

      if (!video) {
        throw new Error('Camera preview unavailable');
      }

      streamRef.current = stream;
      ownsStreamRef.current = ownsStream;

      video.srcObject = stream;
      await video.play();

      if (generation !== generationRef.current) return;

      const vision = await FilesetResolver.forVisionTasks(
        '/mediapipe/wasm'
      );

      if (generation !== generationRef.current) return;

      model = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: 'CPU',
        },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFaceBlendshapes: true,
      });

      if (generation !== generationRef.current) {
        model.close();
        return;
      }

      modelRef.current = model;
      model = null;

      observationsRef.current = [];
      sessionIdRef.current = crypto.randomUUID();

      lastMediaPipeRef.current = 0;
      lastDeepFaceRef.current = 0;
      deepFaceAvailableRef.current = true;

      runningRef.current = true;

      setStatus('on');
      setMessage('කැමරාව සක්‍රීයයි');

      save();

      const detect = () => {
        if (
          !runningRef.current ||
          generation !== generationRef.current
        ) {
          return;
        }

        const currentVideo = videoRef.current;
        const currentModel = modelRef.current;
        const now = performance.now();

        if (
          currentVideo &&
          currentModel &&
          currentVideo.readyState >= 2
        ) {
          if (now - lastMediaPipeRef.current >= 300) {
            lastMediaPipeRef.current = now;

            try {
              const result = currentModel.detectForVideo(
                currentVideo,
                now
              );

              const face = result.faceLandmarks[0];
              const categories =
                result.faceBlendshapes[0]?.categories ?? [];

              const score = (name: string) =>
                categories.find(
                  (category) => category.categoryName === name
                )?.score ?? 0;

              const visible = Boolean(face);

              setFaceVisible(visible);

              observationsRef.current.push({
                at: Date.now(),
                faceVisible: visible,
                headPositionProxy: face
                  ? Math.abs(
                      (face[1]?.x ?? 0.5) -
                        ((face[234]?.x ?? 0.3) +
                          (face[454]?.x ?? 0.7)) /
                          2
                    )
                  : 0,
                smile: visible
                  ? (score('mouthSmileLeft') +
                      score('mouthSmileRight')) /
                    2
                  : null,
                blink: visible
                  ? (score('eyeBlinkLeft') +
                      score('eyeBlinkRight')) /
                    2
                  : null,
                jawOpen: visible ? score('jawOpen') : null,
              });

              if (observationsRef.current.length > 1000) {
                observationsRef.current.shift();
              }

              save();
            } catch (error) {
              console.warn('MediaPipe frame failed', error);
            }
          }

          if (
            deepFaceAvailableRef.current &&
            now - lastDeepFaceRef.current >= 2500
          ) {
            lastDeepFaceRef.current = now;

            void analyzeExpression(currentVideo, generation);
          }
        }

        frameRef.current = requestAnimationFrame(detect);
      };

      frameRef.current = requestAnimationFrame(detect);
    } catch (error) {
      if (model) model.close();

      if (generation !== generationRef.current) {
        if (ownsStream && stream) {
          stream.getTracks().forEach((track) => track.stop());
        }
        return;
      }

      stop();

      setStatus('error');
      setMessage(
        error instanceof Error
          ? error.message
          : 'කැමරාව සක්‍රීය කළ නොහැක'
      );

      console.error('Camera initialization failed:', error);
    }
  }

  return (
    <aside
      className="fixed bottom-4 right-4 z-[9999] w-56 rounded-2xl border-2 border-blue-400 bg-white p-3 shadow-2xl"
      aria-label="Optional behaviour camera monitor"
    >
      <div className="relative overflow-hidden rounded-xl bg-slate-900">
        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          className="block aspect-video w-full -scale-x-100 object-cover"
        />

        {status === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-center text-xs text-white">
            කැමරාව සූදානම් කරමින්...
          </div>
        )}

        {status === 'off' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-center text-xs text-white">
            කැමරාව ක්‍රියා විරහිතයි
          </div>
        )}
      </div>

      <div className="mt-2">
        <p className="text-xs font-semibold text-slate-800">
          {status === 'on'
            ? faceVisible
              ? 'මුහුණ පෙනේ'
              : 'මුහුණ නොපෙනේ'
            : 'කැමරා නිරීක්ෂණය'}
        </p>

        <p className="mt-1 break-words text-[10px] text-slate-500">
          {message || 'විකල්ප කැමරාව'}
        </p>
      </div>

      {(status === 'off' || status === 'error') && (
        <button
          type="button"
          onClick={() => void start()}
          className="mt-2 w-full rounded-lg bg-blue-600 px-2 py-2 text-xs font-semibold text-white hover:bg-blue-700"
        >
          කැමරාව සක්‍රීය කරන්න
        </button>
      )}

      {status === 'on' && (
        <button
          type="button"
          onClick={() => {
            stop();
            setStatus('off');
            setMessage('කැමරාව නවතා ඇත');
          }}
          className="mt-2 w-full rounded-lg bg-slate-200 px-2 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-300"
        >
          කැමරාව නවත්වන්න
        </button>
      )}
    </aside>
  );
}
