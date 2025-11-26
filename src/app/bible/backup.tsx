import { useState } from 'react';
import { db, Note, TextAnnotation } from '../../lib/db';

interface BackupData {
  annotations: TextAnnotation[];
  notes: Note[];
  // journals: Journal[];
  // verseLinks: VerseLink[];
}

export default function Backup() {
  const [token, setToken] = useState<string | null>(null);

  const exportData = async () => {
    const data: BackupData = {
      annotations: await db.annotations.toArray(),
      notes: await db.notes.toArray(),
      //journals: await db.journals.toArray(),
      //verseLinks: await db.verseLinks.toArray(),
    };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bible-data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const data: BackupData = JSON.parse(await file.text());
    await db.annotations.bulkPut(data.annotations);
    await db.notes.bulkPut(data.notes);
    // await db.journals.bulkPut(data.journals);
    // await db.verseLinks.bulkPut(data.verseLinks);
  };

  const initGoogleDrive = () => {
    // Type assertion for gapi (not fully typed)
    const gapi = (window as any).gapi;
    gapi.load('client:auth2', () => {
      gapi.client
        .init({
          clientId: 'YOUR_CLIENT_ID',
          scope: 'https://www.googleapis.com/auth/drive.file',
        })
        .then(() => {
          gapi.auth2
            .getAuthInstance()
            .signIn()
            .then(() => {
              setToken(
                gapi.auth2.getAuthInstance().currentUser.get().getAuthToken()
              );
            });
        });
    });
  };

  const uploadToDrive = async () => {
    if (!token) return;
    const data: BackupData = {
      annotations: await db.annotations.toArray(),
      notes: await db.notes.toArray(),
      // journals: await db.journals.toArray(),
      // verseLinks: await db.verseLinks.toArray(),
    };
    const file = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const metadata = {
      name: 'bible-data.json',
      mimeType: 'application/json',
    };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
  };

  return (
    <div>
      <h1>Backup</h1>
      <button onClick={initGoogleDrive}>Sign in with Google</button>
      <button onClick={uploadToDrive} disabled={!token}>
        Backup to Drive
      </button>
      <button onClick={exportData}>Export Data</button>
      <input type="file" accept=".json" onChange={importData} />
    </div>
  );
}