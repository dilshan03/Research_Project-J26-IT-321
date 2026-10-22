
import { useEffect, useRef, useState } from 'react';

const questions = [
  { question: '5 + 3 = ?', options: [6, 7, 8, 9], answer: 8 },
  { question: '12 - 4 = ?', options: [6, 8, 9, 10], answer: 8 },
  { question: '3 × 4 = ?', options: [7, 10, 12, 14], answer: 12 },
];

type RecordRow = {
  question: string;
  response_time_ms: number;
  click_count: number;
  incorrect_attempts: number;
  answer_changes: number;
  inactivity_ms: number;
};

export default function StandaloneDataCollection() {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [clicks, setClicks] = useState(0);
  const [changes, setChanges] = useState(0);
  const [errors, setErrors] = useState(0);
  const startedAt = useRef(Date.now());
  const lastActionAt = useRef(Date.now());
  const longestPause = useRef(0);

  const current = questions[index];
  const finished = index >= questions.length;

  useEffect(() => {
    startedAt.current = Date.now();
    lastActionAt.current = Date.now();
    longestPause.current = 0;
  }, [index]);

  function selectAnswer(value: number) {
    const now = Date.now();
    longestPause.current = Math.max(
      longestPause.current,
      now - lastActionAt.current
    );
    lastActionAt.current = now;

    setClicks(c => c + 1);
    if (selected !== null && selected !== value) {
      setChanges(c => c + 1);
    }
    setSelected(value);
  }

  function submitAnswer() {
    if (selected === null || !current) return;

    const now = Date.now();
    const incorrect = selected !== current.answer ? 1 : 0;

    const row: RecordRow = {
      question: current.question,
      response_time_ms: now - startedAt.current,
      click_count: clicks + 1,
      incorrect_attempts: errors + incorrect,
      answer_changes: changes,
      inactivity_ms: longestPause.current,
    };

    setRecords(previous => [...previous, row]);
    setErrors(0);
    setClicks(0);
    setChanges(0);
    setSelected(null);
    setIndex(i => i + 1);
  }

  function downloadCSV() {
    const headers = [
      'question', 'response_time_ms', 'click_count',
      'incorrect_attempts', 'answer_changes', 'inactivity_ms'
    ];

    const rows = records.map(record =>
      headers.map(key => record[key as keyof RecordRow])
    );

    const csv = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'behaviour_dataset.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ maxWidth: 650, margin: '50px auto', padding: 24 }}>
      <h1>MathQuest — Behaviour Data Collection</h1>
      <p>Standalone Component 4 testing environment</p>

      {!finished && current ? (
        <>
          <h2>Question {index + 1}</h2>
          <h3>{current.question}</h3>

          {current.options.map(option => (
            <button
              key={option}
              onClick={() => selectAnswer(option)}
              style={{
                margin: 8,
                padding: 16,
                background: selected === option ? '#b9e3ff' : '#eee',
                color: '#111'
              }}
            >
              {option}
            </button>
          ))}

          <div style={{ marginTop: 24 }}>
            <button disabled={selected === null} onClick={submitAnswer}>
              Submit Answer
            </button>
          </div>

          <p>Clicks: {clicks}</p>
          <p>Answer changes: {changes}</p>
        </>
      ) : (
        <>
          <h2>Session Completed</h2>
          <p>Collected records: {records.length}</p>
          <button onClick={downloadCSV}>Download CSV</button>
        </>
      )}
    </div>
  );
}
