'use client';

import { useState, useEffect, JSX } from 'react';
import { db, Verse, VerseGroup, getBooks, getChapters, deleteVerseGroup, updateVerseGroup, importTeluguData, bibleBooks, Note } from '../../lib/db';
import {Verse as VerseDisplay} from '../app-components/verse';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ChromePicker } from 'react-color';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from '@/components/ui/dropdown-menu';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { MoreHorizontal, CheckCircle, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {ModeToggle} from "@/app/toggle-theme";

export default function Bible() {
  const [verses, setVerses] = useState<Verse[]>([]);
  const [groups, setGroups] = useState<VerseGroup[]>([]);
  const [books, setBooks] = useState<string[]>([]);
  const [chapters, setChapters] = useState<number[]>([]);
  const [book, setBook] = useState<string>('Genesis');
  const [chapter, setChapter] = useState<number>(1);
  const [isLoadingBooks, setIsLoadingBooks] = useState<boolean>(true);
  const [isLoadingChapters, setIsLoadingChapters] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
  const [isGrouping, setIsGrouping] = useState<boolean>(false);
  const [groupSubheading, setGroupSubheading] = useState<string>('');
  const [groupBorderColor, setGroupBorderColor] = useState<string>('#FF0000');
  const [groupNotes, setGroupNotes] = useState<string>('');
  const [editingGroup, setEditingGroup] = useState<VerseGroup | null>(null);
  const [showDeleteGroupDialog, setShowDeleteGroupDialog] = useState<string | null>(null);
  const [isEditingGroupNotes, setIsEditingGroupNotes] = useState<VerseGroup | null>(null);
  const [translation, setTranslation] = useState<'English' | 'Telugu' | 'Both'>(
    (localStorage.getItem('bibleTranslation') as 'English' | 'Telugu' | 'Both') || 'English'
  );
  const [teluguTextMap, setTeluguTextMap] = useState<Map<string, string>>(new Map());
  const [isNotePaneOpen, setIsNotePaneOpen] = useState<boolean>(false);
  const [noteVerseRef, setNoteVerseRef] = useState<string>('');
  const [newNote, setNewNote] = useState<string>('');
  const [savedNotes, setSavedNotes] = useState<Note[]>([]);

  useEffect(() => {
    const initializeData = async () => {
      try {
        setIsLoadingBooks(true);
        await importTeluguData();
        const bookList = await getBooks();
        if (bookList.length === 0) {
          console.warn('No books found in IndexedDB');
          setError('No books available. Please ensure Bible data is loaded.');
        } else {
          setBooks(bookList);
          if (!bookList.includes(book) && bookList.length > 0) {
            setBook('Genesis');
            setChapter(1);
          }
        }
      } catch (err) {
        console.error('Failed to load books:', err);
        setError('Failed to load books. Please try again.');
      } finally {
        setIsLoadingBooks(false);
      }
    };
    initializeData();
  }, []);

  useEffect(() => {
    const fetchChapters = async () => {
      try {
        setIsLoadingChapters(true);
        const chapterList = await getChapters(book);
        if (chapterList.length === 0) {
          console.warn(`No chapters found for ${book}`);
          setError(`No chapters available for ${book}.`);
          setChapters([]);
          setChapter(1);
        } else {
          setChapters(chapterList);
          if (!chapterList.includes(chapter)) {
            setChapter(chapterList[0] || 1);
          }
        }
      } catch (err) {
        console.error(`Failed to load chapters for ${book}:`, err);
        setError(`Failed to load chapters for ${book}.`);
      } finally {
        setIsLoadingChapters(false);
      }
    };
    fetchChapters();
  }, [book]);

  useEffect(() => {
    const fetchVersesAndGroups = async () => {
      try {
        let fetchedVerses = await db.bibleVerses
          .where('[book_name+chapter]')
          .equals([book, chapter])
          .toArray();
        fetchedVerses = fetchedVerses.sort((a, b) => a.verse - b.verse);
        setVerses(fetchedVerses);

        const fetchedTeluguVerses = await db.teluguVerses
          .where('[book_name+chapter]')
          .equals([book, chapter])
          .toArray();
        const newTeluguTextMap = new Map<string, string>();
        fetchedTeluguVerses.forEach((verse) => {
          newTeluguTextMap.set(`${verse.book_name}:${verse.chapter}:${verse.verse}`, verse.text);
        });
        setTeluguTextMap(newTeluguTextMap);

        const fetchedGroups = await db.verseGroups
          .where('[book_name+chapter]')
          .equals([book, chapter])
          .toArray();
        fetchedGroups.sort((a, b) => Number(a.verseRefs[0]) - Number(b.verseRefs[0]));
        setGroups(fetchedGroups);
      } catch (error) {
        console.error('Error fetching verses or groups:', error);
        setError('Failed to load verses or groups.');
      }
    };
    fetchVersesAndGroups();
    localStorage.setItem('bibleTranslation', translation);
  }, [book, chapter, translation]);

  useEffect(() => {
    const fetchNotes = async () => {
      if (noteVerseRef) {
        const fetchedNotes = await db.notes.where('verseRef').equals(noteVerseRef).toArray();
        setSavedNotes(fetchedNotes);
      }
    };
    fetchNotes();
  }, [noteVerseRef, isNotePaneOpen]);

  useEffect(() => {
    const header = document.querySelector('.header-glass') as HTMLElement;
    if (header) {
      document.documentElement.style.setProperty('--header-height', `${header.offsetHeight}px`);
      import('animejs').then(({ animate }) => {
        animate('.header-glass', {
          opacity: [0, 1],
          duration: 600,
          ease: 'outQuad',
        });
      });
    }
  }, []);

  useEffect(() => {
    if (isNotePaneOpen) {
      import('animejs').then(({ animate }) => {
        animate('.note-pane', {
          translateX: ['200px', '0px'],
          opacity: [0, 1],
          duration: 300,
          ease: 'outQuad',
        });
      });
    }
  }, [isNotePaneOpen]);

  useEffect(() => {
    import('animejs').then(({ animate, stagger }) => {
      animate('.group-container', {
        opacity: [0, 1],
        translateY: ['10px', '0px'],
        duration: 600,
        ease: 'outQuad',
        delay: stagger('100ms'),
      });
    });
  }, [groups]);

  useEffect(() => {
    const dialogs = document.querySelectorAll('.dialog-content');
    import('animejs').then(({ animate }) => {
      animate(dialogs, {
        scale: [0.95, 1],
        opacity: [0, 1],
        duration: 300,
        ease: 'outQuad',
      });
    });
  }, [isGrouping, showDeleteGroupDialog, isEditingGroupNotes]);

  const toggleVerseSelection = (verseNumber: number) => {
    const newSelected = [...selectedVerses];
    if (newSelected.includes(verseNumber)) {
      newSelected.splice(newSelected.indexOf(verseNumber), 1);
    } else {
      newSelected.push(verseNumber);
    }
    setSelectedVerses(newSelected.sort((a, b) => a - b));
  };

  const isSequential = (verses: number[]) => {
    if (verses.length <= 1) return true;
    for (let i = 1; i < verses.length; i++) {
      if (verses[i] !== verses[i - 1] + 1) {
        return false;
      }
    }
    return true;
  };

  const navigateChapter = async (direction: 'previous' | 'next') => {
    const allBooks = [...bibleBooks.oldTestament, ...bibleBooks.newTestament];
    const bookIndex = allBooks.indexOf(book);
    const maxChapter = chapters.length > 0 ? chapters[chapters.length - 1] : 1;

    if (direction === 'previous') {
      if (chapter > 1) {
        setChapter(chapter - 1);
      } else if (bookIndex > 0) {
        const prevBook = allBooks[bookIndex - 1];
        const prevChapters = await getChapters(prevBook);
        setBook(prevBook);
        setChapter(prevChapters[prevChapters.length - 1] || 1);
      } else {
        const lastBook = allBooks[allBooks.length - 1];
        const lastChapters = await getChapters(lastBook);
        setBook(lastBook);
        setChapter(lastChapters[lastChapters.length - 1] || 1);
      }
    } else {
      if (chapter < maxChapter) {
        setChapter(chapter + 1);
      } else if (bookIndex < allBooks.length - 1) {
        const nextBook = allBooks[bookIndex + 1];
        setBook(nextBook);
        setChapter(1);
      } else {
        setBook(allBooks[0]);
        setChapter(1);
      }
    }
  };

  const createOrUpdateGroup = async () => {
    if (selectedVerses.length === 0) {
      setError('No verses selected.');
      return;
    }
    if (!isSequential(selectedVerses)) {
      setError('Only consecutive verses can be grouped (e.g., 1-2-3 or 4-5).');
      return;
    }
    const verseRefs = selectedVerses.map(String);
    const group: VerseGroup = {
      id: editingGroup ? editingGroup.id : undefined,
      book_name: book,
      chapter,
      verseRefs,
      subheading: groupSubheading,
      notes: groupNotes,
      borderColor: groupBorderColor,
      createdAt: editingGroup ? editingGroup.createdAt : Date.now(),
      updatedAt: Date.now(),
    };
    try {
      await updateVerseGroup(group);
      setGroups(groups.filter(g => g.id !== group.id).concat(group));
      setSelectedVerses([]);
      setIsGrouping(false);
      setEditingGroup(null);
      setGroupSubheading('');
      setGroupNotes('');
      setError(null);
    } catch (error) {
      console.error('Error creating/updating group:', error);
      setError('Failed to create/update group.');
    }
  };

  const updateGroupNotes = async (group: VerseGroup, newNotes: string) => {
    const updatedGroup = { ...group, notes: newNotes, updatedAt: Date.now() };
    try {
      await updateVerseGroup(updatedGroup);
      setGroups(groups.filter(g => g.id !== group.id).concat(updatedGroup));
      setIsEditingGroupNotes(null);
      setGroupNotes('');
      setError(null);
    } catch (error) {
      console.error('Error updating group notes:', error);
      setError('Failed to update group notes.');
    }
  };

  const removeVerseFromGroup = async (groupId: string, verseNumber: number) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    const updatedRefs = group.verseRefs.filter(ref => ref !== verseNumber.toString());
    if (updatedRefs.length === 0) {
      await deleteVerseGroup(groupId);
      setGroups(groups.filter(g => g.id !== groupId));
    } else {
      const updatedGroup = { ...group, verseRefs: updatedRefs, updatedAt: Date.now() };
      await updateVerseGroup(updatedGroup);
      setGroups(groups.filter(g => g.id !== groupId).concat(updatedGroup));
    }
  };

  const deleteGroup = async (id: string) => {
    try {
      await deleteVerseGroup(id);
      setGroups(groups.filter(g => g.id !== id));
      setShowDeleteGroupDialog(null);
      setError(null);
    } catch (error) {
      console.error('Error deleting group:', error);
      setError('Failed to delete group.');
    }
  };

  const editGroup = (group: VerseGroup) => {
    setEditingGroup(group);
    setSelectedVerses(group.verseRefs.map(Number));
    setGroupSubheading(group.subheading);
    setGroupBorderColor(group.borderColor);
    setGroupNotes(group.notes);
    setIsGrouping(true);
  };

  const editGroupNotes = (group: VerseGroup) => {
    setIsEditingGroupNotes(group);
    setGroupNotes(group.notes);
  };

  const navigateToVerse = (verseRef: string) => {
    const match = verseRef.match(/^([A-Za-z]+):(\d+):(\d+)$/);
    if (!match) {
      setError('Invalid verse reference format.');
      return;
    }
    const [, bookName, chapterNum] = match;
    if (books.includes(bookName)) {
      setBook(bookName);
      setChapter(Number(chapterNum));
      setError(null);
    } else {
      setError(`Book ${bookName} not found.`);
    }
  };

  const getGroupForVerse = (verseNumber: number) => {
    return groups.find((group) => group.verseRefs.includes(verseNumber.toString()));
  };

  const handleOpenNotePane = (verseRef: string, initialNote: string) => {
    setNoteVerseRef(verseRef);
    setNewNote(initialNote);
    setIsNotePaneOpen(true);
  };

  const handleSaveNote = async () => {
    if (!newNote.trim()) {
      setError('Note cannot be empty.');
      return;
    }
    const note: Note = {
      verseRef: noteVerseRef,
      content: newNote,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    try {
      await db.notes.put(note);
      setSavedNotes([...savedNotes, note]);
      setNewNote('');
      setError(null);
      const fetchedVerses = await db.bibleVerses
        .where('[book_name+chapter]')
        .equals([book, chapter])
        .toArray();
      setVerses(fetchedVerses.sort((a, b) => a.verse - b.verse));
    } catch (error) {
      console.error('Error saving note:', error);
      setError('Failed to save note.');
    }
  };

  const handleCloseNotePane = () => {
    setIsNotePaneOpen(false);
    setNewNote('');
    setNoteVerseRef('');
    setSavedNotes([]);
  };

  return (
    <div className="w-full h-screen flex flex-col">
      <script src="https://cdnjs.cloudflare.com/ajax/libs/animejs/4.0.0/anime.min.js" async></script>
      <div className="sticky top-0 z-10">
        <div className="w-full max-w-screen-2xl mx-auto px-4 py-4">
          <Card className="bg-white/30 dark:bg-neutral-900/30 backdrop-blur-xl border border-white/20 dark:border-neutral-800/40 rounded-lg shadow-sm">
            <CardContent className="pt-4 pb-4">
              <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">Bible Notes</h1>
              </div>
              {error && (
                <Alert variant="destructive" className="mb-4 border-none max-w-screen-2xl mx-auto">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="flex flex-wrap gap-4 items-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="bg-card">
                      {book || (isLoadingBooks ? 'Loading books...' : 'Select a book')}
                      <BookOpen className="w-4 h-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-card">
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>Old Testament</DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="bg-card max-h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-neutral-300">
                        {bibleBooks.oldTestament.map((bookName) => (
                          <DropdownMenuItem
                            key={bookName}
                            onClick={() => setBook(bookName)}
                            disabled={isLoadingBooks || !books.includes(bookName)}
                          >
                            {bookName}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>New Testament</DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="bg-card max-h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-neutral-300">
                        {bibleBooks.newTestament.map((bookName) => (
                          <DropdownMenuItem
                            key={bookName}
                            onClick={() => setBook(bookName)}
                            disabled={isLoadingBooks || !books.includes(bookName)}
                          >
                            {bookName}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Select
                  value={chapter.toString()}
                  onValueChange={(value) => setChapter(Number(value))}
                  disabled={isLoadingChapters || chapters.length === 0}
                >
                  <SelectTrigger className="bg-card">
                    <SelectValue placeholder={isLoadingChapters ? 'Loading chapters...' : 'Select chapter'} />
                  </SelectTrigger>
                  <SelectContent className="bg-card">
                    {chapters.map((ch) => (
                      <SelectItem key={ch} value={ch.toString()}>
                        Chapter {ch}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <ToggleGroup
                  type="single"
                  value={translation}
                  variant="outline"
                  onValueChange={(value: 'English' | 'Telugu' | 'Both') => value && setTranslation(value)}
                  className="w-[150px]"
                >
                  <ToggleGroupItem value="English" aria-label="English" className="bg-card">
                    EN
                  </ToggleGroupItem>
                  <ToggleGroupItem value="Telugu" aria-label="Telugu" className="bg-card">
                    TE
                  </ToggleGroupItem>
                  <ToggleGroupItem value="Both" aria-label="Both" className="bg-card">
                    Both
                  </ToggleGroupItem>
                </ToggleGroup>
                {selectedVerses.length > 0 && (
                  <Button onClick={() => setIsGrouping(true)} className="bg-primary text-white">
                    Group Selected Verses
                  </Button>
                )}
                <ModeToggle></ModeToggle>
              </div>
              <div className="flex gap-4 mt-4">
                <Button
                  onClick={() => navigateChapter('previous')}
                  disabled={book === bibleBooks.oldTestament[0] && chapter === 1}
                  variant="outline"
                  className="flex-1 bg-card"
                  aria-label="Go to previous chapter"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Previous Chapter
                </Button>
                <Button
                  onClick={() => navigateChapter('next')}
                  disabled={book === bibleBooks.newTestament[bibleBooks.newTestament.length - 1] && chapter === chapters[chapters.length - 1]}
                  variant="outline"
                  className="flex-1 bg-card"
                  aria-label="Go to next chapter"
                >
                  Next Chapter
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="fixed left-4 top-1/2 transform -translate-y-1/2 z-20 hidden md:block">
        <Button
          onClick={() => navigateChapter('previous')}
          disabled={book === bibleBooks.oldTestament[0] && chapter === 1}
          variant="outline"
          size="icon"
          className="bg-card"
          aria-label="Go to previous chapter"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
      </div>
      <div className="fixed right-4 top-1/2 transform -translate-y-1/2 z-20 hidden md:block">
        <Button
          onClick={() => navigateChapter('next')}
          disabled={book === bibleBooks.newTestament[bibleBooks.newTestament.length - 1] && chapter === chapters[chapters.length - 1]}
          variant="outline"
          size="icon"
          className="bg-card"
          aria-label="Go to next chapter"
        >
          <ChevronRight className="w-6 h-6" />
        </Button>
      </div>
      <div className={`content-below-header ${isNotePaneOpen ? 'bible-grid-with-pane' : 'bible-grid'} gap-1rem`}>
        <div className="verses-pane">
          <div className="w-full max-w-screen-2xl mx-auto px-2">
            {verses.length === 0 ? (
              <Card className="verse-row">
                <CardContent className="py-2 px-2 text-sm">
                  No verses found for {book} {chapter}
                </CardContent>
              </Card>
            ) : (
              (() => {
                const elements: JSX.Element[] = [];
                let index = 0;

                while (index < verses.length) {
                  const verse = verses[index];
                  const group = getGroupForVerse(verse.verse);

                  if (group) {
                    const groupVerses = verses.filter(v => group.verseRefs.includes(v.verse.toString()));
                    groupVerses.sort((a, b) => a.verse - b.verse);
                    const verseRange = `${groupVerses[0].verse}${groupVerses.length > 1 ? `-${groupVerses[groupVerses.length - 1].verse}` : ''}`;

                    elements.push(
                      <Card key={`group-${group.id}`} className="group-container" style={{ borderColor: group.borderColor }}>
                        <CardContent className="p-2">
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex gap-1 items-center">
                              <Badge variant="outline" className="border-none">{book}</Badge>
                              <Badge variant="outline" className="border-none">{chapter}</Badge>
                              <Badge variant="outline" className="border-none">{verseRange}</Badge>
                              <span className="text-sm font-bold">{group.subheading}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-card">
                                  <DropdownMenuItem onClick={() => editGroup(group)}>
                                    Edit Group
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => editGroupNotes(group)}>
                                    Edit Group Notes
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setShowDeleteGroupDialog(group.id!)}>
                                    Delete Group
                                  </DropdownMenuItem>
                                  {groupVerses.map(v => (
                                    <DropdownMenuItem
                                      key={`remove-${v.verse}`}
                                      onClick={() => removeVerseFromGroup(group.id!, v.verse)}
                                    >
                                      Remove Verse {v.verse}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                          {groupVerses.map((groupVerse) => (
                            <div key={`${groupVerse.book_name}:${groupVerse.chapter}:${groupVerse.verse}`} className="verse-row">
                              <VerseDisplay
                                verse={groupVerse}
                                translation={translation}
                                teluguText={teluguTextMap.get(`${groupVerse.book_name}:${groupVerse.chapter}:${groupVerse.verse}`)}
                                onSelect={() => toggleVerseSelection(groupVerse.verse)}
                                onNavigate={navigateToVerse}
                                isGrouped={true}
                                isSelected={selectedVerses.includes(groupVerse.verse)}
                                onOpenNoteDrawer={handleOpenNotePane}
                              />
                            </div>
                          ))}
                          {group.notes && (
                            <div className="text-sm p-2 bg-muted rounded-md mt-2">
                              Group Notes: {group.notes}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                    index += groupVerses.length;
                  } else {
                    elements.push(
                      <div key={`${verse.book_name}:${verse.chapter}:${verse.verse}`} className="verse-row">
                        <VerseDisplay
                          verse={verse}
                          translation={translation}
                          teluguText={teluguTextMap.get(`${verse.book_name}:${verse.chapter}:${verse.verse}`)}
                          onSelect={() => toggleVerseSelection(verse.verse)}
                          onNavigate={navigateToVerse}
                          isGrouped={false}
                          isSelected={selectedVerses.includes(verse.verse)}
                          onOpenNoteDrawer={handleOpenNotePane}
                        />
                      </div>
                    );
                    index++;
                  }
                }

                return elements;
              })()
            )}
          </div>
          {/* <div className="w-full max-w-screen-2xl mx-auto px-4 flex gap-4 mt-4">
            <Button
              onClick={() => navigateChapter('previous')}
              disabled={book === bibleBooks.oldTestament[0] && chapter === 1}
              variant="outline"
              className="flex-1 bg-card"
              aria-label="Go to previous chapter"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous Chapter
            </Button>
            <Button
              onClick={() => navigateChapter('next')}
              disabled={book === bibleBooks.newTestament[bibleBooks.newTestament.length - 1] && chapter === chapters[chapters.length - 1]}
              variant="outline"
              className="flex-1 bg-card"
              aria-label="Go to next chapter"
            >
              Next Chapter
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div> */}
        </div>
        {isNotePaneOpen && (
          <Card className="note-pane w-full max-w-screen-2xl mx-auto px-4">
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Add Note</h2>
                <Button variant="ghost" size="sm" onClick={handleCloseNotePane} aria-label="Close note pane">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Add a note for {noteVerseRef}.
              </p>
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Enter your note..."
                className="w-full bg-card mb-4"
              />
              {savedNotes.length > 0 && (
                <div className="notes-list mb-4">
                  <h3 className="text-sm font-semibold mb-2">Saved Notes:</h3>
                  {savedNotes.map((note) => (
                    <div key={note.id} className="text-sm p-2 bg-muted rounded-md mb-2">
                      {note.content}
                      <span className="text-xs text-muted-foreground block">
                        {new Date(note.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-col gap-2">
                <Button onClick={handleSaveNote} className="bg-primary text-white">
                  Save Note
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCloseNotePane}
                  className="bg-card"
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      <Dialog open={isGrouping} onOpenChange={setIsGrouping}>
        <DialogContent className="bg-card dialog-content">
          <DialogHeader>
            <DialogTitle>{editingGroup ? 'Edit Group' : 'Group Verses'}</DialogTitle>
            <DialogDescription>
              {editingGroup ? 'Update' : 'Add'} a subheading, border color, and notes for the selected verses: {selectedVerses.join(', ')}.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={groupSubheading}
            onChange={(e) => setGroupSubheading(e.target.value)}
            placeholder="Subheading"
            className="w-full mb-2 bg-card"
          />
          <ChromePicker
            color={groupBorderColor}
            onChange={(color) => setGroupBorderColor(color.hex)}
          />
          <Textarea
            value={groupNotes}
            onChange={(e) => setGroupNotes(e.target.value)}
            placeholder="Group notes..."
            className="w-full mb-2 bg-card"
          />
          <Button onClick={createOrUpdateGroup} className="mt-4 bg-primary text-white">
            {editingGroup ? 'Update Group' : 'Create Group'}
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog open={!!isEditingGroupNotes} onOpenChange={() => setIsEditingGroupNotes(null)}>
        <DialogContent className="bg-card dialog-content">
          <DialogHeader>
            <DialogTitle>Edit Group Notes</DialogTitle>
            <DialogDescription>
              Update notes for the group: {isEditingGroupNotes?.subheading}.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={groupNotes}
            onChange={(e) => setGroupNotes(e.target.value)}
            placeholder="Group notes..."
            className="w-full mb-2 bg-card"
          />
          <Button
            onClick={() => isEditingGroupNotes && updateGroupNotes(isEditingGroupNotes, groupNotes)}
            className="mt-4 bg-primary text-white"
          >
            Update Notes
          </Button>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!showDeleteGroupDialog} onOpenChange={() => setShowDeleteGroupDialog(null)}>
        <AlertDialogContent className="bg-card dialog-content">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this group?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-card">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteGroup(showDeleteGroupDialog as string)}
              className="bg-primary text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}