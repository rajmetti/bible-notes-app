'use client';

import { useState, useEffect } from 'react';
import { db, Note } from '../../../lib/db';

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    db.notes.toArray().then(setNotes);
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">All Notes</h1>
      <div className="mt-4 space-y-2">
        {notes.length === 0 ? (
          <p>No notes yet.</p>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="p-2 border rounded">
              <p>
                <strong>{note.verseRef}</strong>: {note.content}
              </p>
              <p className="text-sm text-gray-500">
                Created: {new Date(note.createdAt).toLocaleString()}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}