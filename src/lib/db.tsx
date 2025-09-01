import Dexie, { Table } from 'dexie';

// Data models
interface Verse {
  id?: number;
  book_name: string;
  book: number;
  chapter: number;
  verse: number;
  text: string;
}

interface Note {
  id?: string;
  verseRef: string; // Format: "Genesis:1:1"
  content: string;
  createdAt: number;
  updatedAt: number;
}

interface Highlight {
  id?: string;
  verseRef: string;
  color: string;
  language: 'English' | 'Telugu';
  createdAt: number;
  updatedAt: number;
}

interface VerseLink {
  id?: string;
  sourceRef: string; // Format: "Genesis:1:1"
  targetRef: string; // Format: "John:3:16"
  createdAt: number;
  updatedAt: number;
}

interface DrawNote {
  id?: string;
  verseRef: string; // Format: "Genesis:1:1"
  data: string; // Base64-encoded canvas data
  createdAt: number;
  updatedAt: number;
}

interface VerseGroup {
  id?: string;
  book_name: string; // e.g., "Genesis"
  chapter: number; // e.g., 1
  verseRefs: string[]; // Array of verse numbers as strings, e.g., ["1", "2", "3"]
  subheading: string; // Subheading for the group
  notes: string; // Group notes
  borderColor: string; // Hex color for border, e.g., "#FF0000"
  createdAt: number;
  updatedAt: number;
}

interface TextAnnotation {
  id?: string;
  verseRef: string;
  start: number;
  end: number;
  style: {
    color?: string;
    underlineType?: 'solid' | 'dotted' | 'dashed' | 'wavy';
    bold?: boolean;
    italic?: boolean;
    fontFamily?: string;
  };
  language: 'English' | 'Telugu';
  createdAt: number;
  updatedAt: number;
}

export const bibleBooks = {
  oldTestament: [
    'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
    'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
    '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra',
    'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs',
    'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations',
    'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
    'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk',
    'Zephaniah', 'Haggai', 'Zechariah', 'Malachi'
  ],
  newTestament: [
    'Matthew', 'Mark', 'Luke', 'John', 'Acts',
    'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians',
    'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy',
    '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James',
    '1 Peter', '2 Peter', '1 John', '2 John', '3 John',
    'Jude', 'Revelation'
  ]
};

export class BibleNotesDB extends Dexie {
  bibleVerses!: Table<Verse>;
  teluguVerses!: Table<Verse>;
  notes!: Table<Note>;
  highlights!: Table<Highlight>;
  verseLinks!: Table<VerseLink>;
  drawNotes!: Table<DrawNote>;
  textAnnotations!: Table<TextAnnotation>;
  verseGroups!: Table<VerseGroup>;

  constructor() {
    super('BibleNotesDB');
    this.version(2).stores({
      bibleVerses: '++id, [book_name+chapter+verse], [book_name+chapter]',
      teluguVerses: '++id, [book_name+chapter+verse], [book_name+chapter]',
      notes: '++id, verseRef',
      highlights: '++id, verseRef',
      verseLinks: '++id, sourceRef',
      drawNotes: '++id, verseRef',
      textAnnotations: '++id, verseRef',
      verseGroups: '++id, [book_name+chapter]',
    });
  }
}

const db = new BibleNotesDB();

async function initBibleData(): Promise<void> {
  try {
    console.log('Starting initBibleData...');
    const count = await db.bibleVerses.count();
    console.log(`Current verse count in IndexedDB: ${count}`);
    if (count === 0) {
      console.log('Fetching asv.json...');
      const response = await fetch('/bible/asv.json', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Failed to fetch asv.json: ${response.status} ${response.statusText}`);
      }
      const data: { verses: Verse[] } = await response.json();
      if (!data.verses || !Array.isArray(data.verses)) {
        throw new Error('Invalid data format: verses array not found');
      }
      console.log(`Fetched ${data.verses.length} verses from asv.json`);
      const invalidVerses = data.verses.filter(v => !v.book_name || typeof v.book_name !== 'string');
      if (invalidVerses.length > 0) {
        console.warn('Found invalid book_name values:', invalidVerses);
      }
      await db.bibleVerses.bulkPut(data.verses);
      console.log('Verses successfully stored in IndexedDB');
    } else {
      console.log(`Skipping fetch: IndexedDB already has ${count} verses`);
    }
  } catch (error) {
    console.error('Error in initBibleData:', error);
    throw error;
  }
}

export async function importTeluguData() {
  try {
    const response = await fetch('/bible/telugu.json');
    if (!response.ok) throw new Error('Failed to fetch Telugu JSON');
    const data = await response.json();
    const verses = data.verses.map((verse: Verse) => ({
      ...verse,
      id: `${verse.book_name}:${verse.chapter}:${verse.verse}`,
    }));
    await db.teluguVerses.bulkPut(verses);
    console.log('Telugu data imported successfully');
  } catch (error) {
    console.error('Error importing Telugu data:', error);
    throw error;
  }
}

export async function getChapters(book: string): Promise<number[]> {
  try {
    // Get all verses for the book
    const verses = await db.bibleVerses
      .where('book_name')
      .equals(book)
      .toArray();
    
    // Extract unique chapter numbers
    const chapters = [...new Set(verses.map(verse => verse.chapter))].sort((a, b) => a - b);
    return chapters;
  } catch (error) {
    console.error(`Error fetching chapters for ${book}:`, error);
    return [];
  }
}

async function getBooks(): Promise<string[]> {
  const dbBooks = await db.bibleVerses.orderBy('book_name').uniqueKeys() as string[];
  const allBooks = [...bibleBooks.oldTestament, ...bibleBooks.newTestament];
  // Validate: warn if any canonical books are missing or extra books exist
  const missingBooks = allBooks.filter(book => !dbBooks.includes(book));
  const extraBooks = dbBooks.filter(book => !allBooks.includes(book));
  if (missingBooks.length > 0) {
    console.warn('Missing books in database:', missingBooks);
  }
  if (extraBooks.length > 0) {
    console.warn('Extra books in database:', extraBooks);
  }
  return allBooks; // Return books in canonical order
}

async function deleteHighlight(id: string): Promise<void> {
  try {
    await db.highlights.delete(id);
  } catch (error) {
    console.error('Error deleting highlight:', error);
    throw error;
  }
}

async function deleteNote(id: string): Promise<void> {
  try {
    await db.notes.delete(id);
  } catch (error) {
    console.error('Error deleting note:', error);
    throw error;
  }
}

async function deleteDrawNote(id: string): Promise<void> {
  try {
    await db.drawNotes.delete(id);
  } catch (error) {
    console.error('Error deleting draw note:', error);
    throw error;
  }
}

async function deleteVerseGroup(id: string): Promise<void> {
  try {
    await db.verseGroups.delete(id);
  } catch (error) {
    console.error('Error deleting verse group:', error);
    throw error;
  }
}

async function updateVerseGroup(group: VerseGroup): Promise<void> {
  try {
    await db.verseGroups.put(group);
  } catch (error) {
    console.error('Error updating verse group:', error);
    throw error;
  }
}

async function deleteTextAnnotation(id: string): Promise<void> {
  try {
    await db.textAnnotations.delete(id);
  } catch (error) {
    console.error('Error deleting text annotation:', error);
    throw error;
  }
}

export { db, initBibleData, getBooks, deleteHighlight, deleteNote, deleteDrawNote, deleteVerseGroup, updateVerseGroup, deleteTextAnnotation };
export type { Verse, Note, Highlight, VerseLink, DrawNote, VerseGroup, TextAnnotation };
