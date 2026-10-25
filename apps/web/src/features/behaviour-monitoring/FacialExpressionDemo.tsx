
import { useEffect, useRef, useState } from 'react';
import {
  FaceLandmarker,
  FilesetResolver,
} from '@mediapipe/tasks-vision';

type ExpressionRecord = {
  timestamp: string;
  expression: string;
  smile: number;
  browDown: number;
  browUp: number;
  eyeBlink: number;
  mouthOpen: number;
};

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

const WASM_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm';

function score(
  categories: { categoryName: string; score: number }[],
  name: string
) {
  return categories.find(
    (category) => category.categoryName === name
  )?.score ?? 0;
}

function detectExpression(values: {
  smile: number;
  browDown: number;
  browUp: number;
  eyeBlink: number;
  mouthOpen: number;
}) {
  // Demonstration thresholds, not validated emotion rules.
  if (values.eyeBlink > 0.65) {
    return 'ඇස් පියවීම';
  }

  if (values.smile > 0.45) {
    return 'සිනහවක්';
  }

  if (values.mouthOpen > 0.45) {
    return 'මුඛය විවෘත කිරීම';
  }

  if (values.browUp > 0.45) {
    return 'ඇහිබැම ඉහළට එසවීම';
  }

  if (values.browDown > 0.45) {
    return 'ඇහිබැම පහළට චලනය';
  }

  return 'විශේෂ චලනයක් හඳුනාගෙන නැත';
}

function exportCSV(records: ExpressionRecord[]) {
  const header =
    'timestamp,expression,smile,brow_down,brow_up,eye_blink,mouth_open';

  const rows = records.map((record) =>
    [
      record.timestamp,
      `"${record.expression.replace(/"/g, '""')}"`,
      record.smile,
      record.browDown,
      record.browUp,
      record.eyeBlink,
      record.mouthOpen,
    ].join(',')
  );

  const csv = '\uFEFF' + [header, ...rows].join('\n');

  const blob = new Blob([csv], {
    type: 'text/csv;charset=utf-8',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = 'mathquest-facial-expressions.csv';
  link.click();

  URL.revokeObjectURL(url);
}

export default function FacialExpressionDemo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const modelRef = useRef<FaceLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const recordsRef = useRef<ExpressionRecord[]>([]);
  const lastRecordRef = useRef(0);
  const lastVideoTimeRef = useRef(-1);

  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expression, setExpression] = useState(
    'කැමරාව ආරම්භ කරන්න'
  );
  const [recordCount, setRecordCount] = useState(0);
  const [error, setError] = useState('');
  const [values, setValues] = useState({
    smile: 0,
    browDown: 0,
    browUp: 0,
    eyeBlink: 0,
    mouthOpen: 0,
  });

  function stopCamera() {
    runningRef.current = false;
    setRunning(false);

    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    streamRef.current?.getTracks().forEach(
      (track) => track.stop()
    );
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setExpression('කැමරාව නතර කර ඇත');
  }

  function processFrame() {
    if (!runningRef.current) return;

    const video = videoRef.current;
    const model = modelRef.current;

    if (
      video &&
      model &&
      video.readyState >= 2 &&
      video.currentTime !== lastVideoTimeRef.current
    ) {
      lastVideoTimeRef.current = video.currentTime;
      const now = performance.now();

      const result = model.detectForVideo(video, now);

      if (result.faceLandmarks.length > 0) {
        const categories =
          result.faceBlendshapes[0]?.categories ?? [];

        const current = {
          smile:
            (
              score(categories, 'mouthSmileLeft') +
              score(categories, 'mouthSmileRight')
            ) / 2,

          browDown:
            (
              score(categories, 'browDownLeft') +
              score(categories, 'browDownRight')
            ) / 2,

          browUp: score(categories, 'browInnerUp'),

          eyeBlink:
            (
              score(categories, 'eyeBlinkLeft') +
              score(categories, 'eyeBlinkRight')
            ) / 2,

          mouthOpen: score(categories, 'jawOpen'),
        };

        const detected = detectExpression(current);

        setValues(current);
        setExpression(detected);

        // Save measurements every 500 ms.
        if (now - lastRecordRef.current >= 500) {
          recordsRef.current.push({
            timestamp: new Date().toISOString(),
            expression: detected,
            ...current,
          });

          setRecordCount(recordsRef.current.length);
          lastRecordRef.current = now;
        }
      } else {
        setExpression('මුහුණ හඳුනාගෙන නැත');
        setValues({
          smile: 0,
          browDown: 0,
          browUp: 0,
          eyeBlink: 0,
          mouthOpen: 0,
        });
      }
    }

    animationRef.current = requestAnimationFrame(
      processFrame
    );
  }

  async function startCamera() {
    if (runningRef.current || loading) return;

    setLoading(true);
    setError('');

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          'මෙම බ්‍රවුසරයේ කැමරාව භාවිතා කළ නොහැක.'
        );
      }

      if (!modelRef.current) {
        const vision =
          await FilesetResolver.forVisionTasks(WASM_URL);

        modelRef.current =
          await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: MODEL_URL,
              delegate: 'CPU',
            },
            runningMode: 'VIDEO',
            numFaces: 1,
            outputFaceBlendshapes: true,
          });
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });

      streamRef.current = stream;

      const video = videoRef.current;

      if (!video) {
        stream.getTracks().forEach(
          (track) => track.stop()
        );
        throw new Error('වීඩියෝ දර්ශනය සොයාගත නොහැක.');
      }

      video.srcObject = stream;
      await video.play();

      lastVideoTimeRef.current = -1;
      lastRecordRef.current = 0;
      runningRef.current = true;

      setRunning(true);
      setExpression('මුහුණ හඳුනාගනිමින්...');

      animationRef.current =
        requestAnimationFrame(processFrame);
    } catch (err) {
      stopCamera();
      setError(
        err instanceof Error
          ? err.message
          : 'කැමරාව ආරම්භ කළ නොහැක.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    return () => {
      runningRef.current = false;

      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }

      streamRef.current?.getTracks().forEach(
        (track) => track.stop()
      );

      modelRef.current?.close();
      modelRef.current = null;
    };
  }, []);

  const metrics = [
    { name: 'සිනහව', value: values.smile },
    { name: 'ඇහිබැම පහළට', value: values.browDown },
    { name: 'ඇහිබැම ඉහළට', value: values.browUp },
    { name: 'ඇස් පියවීම', value: values.eyeBlink },
    { name: 'මුඛය විවෘත කිරීම', value: values.mouthOpen },
  ];

  return (
    <main
      lang="si"
      className="min-h-screen bg-slate-50 p-6 text-slate-800"
    >
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <p className="font-semibold text-indigo-700">
            MathQuest · Component 4
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            සජීවී මුහුණේ ප්‍රකාශන හඳුනාගැනීම
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            MediaPipe පරිගණක දෘශ්‍ය තාක්ෂණය
            භාවිතයෙන් සජීවී දත්ත රැස් කිරීම
          </p>
        </header>

        <div className="grid gap-5 md:grid-cols-2">
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold">
              සජීවී කැමරාව
            </h2>

            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="aspect-video w-full rounded-xl bg-slate-900 object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />

            <div className="mt-4 flex gap-3">
              <button
                onClick={startCamera}
                disabled={running || loading}
                className="rounded-xl bg-indigo-600 px-4 py-3 text-white disabled:opacity-50"
              >
                {loading
                  ? 'සූදානම් කරමින්...'
                  : 'කැමරාව ආරම්භ කරන්න'}
              </button>

              <button
                onClick={stopCamera}
                disabled={!running}
                className="rounded-xl bg-rose-600 px-4 py-3 text-white disabled:opacity-50"
              >
                නතර කරන්න
              </button>
            </div>

            {error && (
              <p className="mt-3 text-sm text-red-600">
                {error}
              </p>
            )}
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold">
              හඳුනාගත් මුහුණේ ප්‍රකාශනය
            </h2>

            <div
              aria-live="polite"
              className="my-5 rounded-2xl bg-indigo-50 p-6 text-center"
            >
              <p className="text-2xl font-bold text-indigo-800">
                {expression}
              </p>
            </div>

            <h3 className="mb-4 font-semibold">
              සජීවී චලන ලකුණු
            </h3>

            <div className="space-y-4">
              {metrics.map((metric) => (
                <div key={metric.name}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{metric.name}</span>
                    <span>
                      {Math.round(metric.value * 100)}%
                    </span>
                  </div>

                  <div className="h-3 rounded-full bg-slate-100">
                    <div
                      className="h-3 rounded-full bg-indigo-500"
                      style={{
                        width: `${
                          Math.round(metric.value * 100)
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold">
            දත්ත රැස් කිරීම
          </h2>

          <p className="mt-3 text-sm">
            රැස් කළ වාර්තා ගණන:{' '}
            <strong>{recordCount}</strong>
          </p>

          <p className="mt-2 text-sm">
            දත්ත රැස් කිරීමේ කාල පරතරය:
            තත්පර 0.5
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={() =>
                exportCSV(recordsRef.current)
              }
              disabled={recordCount === 0}
              className="rounded-xl bg-emerald-600 px-4 py-3 text-white disabled:opacity-50"
            >
              CSV දත්ත බාගන්න
            </button>

            <button
              onClick={() => {
                recordsRef.current = [];
                setRecordCount(0);
              }}
              disabled={recordCount === 0}
              className="rounded-xl border border-slate-300 px-4 py-3 disabled:opacity-50"
            >
              දත්ත ඉවත් කරන්න
            </button>
          </div>
        </section>

        <p className="text-sm leading-7 text-slate-500">
          මෙය මුහුණේ චලන හඳුනාගැනීමේ
          පරීක්ෂණයකි. වීඩියෝ
          දර්ශන ගබඩා නොකෙරේ.
        </p>
      </div>
    </main>
  );
}
