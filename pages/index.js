import { useState } from 'react';

export default function Home() {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState('');

  const sendEmail = async () => {
    setStatus('Sending...');

    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, body }),
    });

    const data = await res.json();

    if (res.ok) {
      setStatus('Email sent ✅');
    } else {
      setStatus('Error: ' + data.error);
    }
  };

  return (
    <div style={{ padding: 40, fontFamily: 'Arial' }}>
      <h1>Email Dashboard</h1>

      <input
        placeholder="Recipient Email"
        value={to}
        onChange={(e) => setTo(e.target.value)}
        style={{ width: '100%', marginBottom: 10, padding: 10 }}
      />

      <input
        placeholder="Subject"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        style={{ width: '100%', marginBottom: 10, padding: 10 }}
      />

      <textarea
        placeholder="HTML Email Body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={10}
        style={{ width: '100%', marginBottom: 10, padding: 10 }}
      />

      <button onClick={sendEmail} style={{ padding: 10 }}>
        Send Email
      </button>

      <p>{status}</p>
    </div>
  );
}