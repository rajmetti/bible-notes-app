'use client';

import { useState, useEffect, JSX } from 'react';
import { db, Verse, VerseGroup, getBooks, getChapters, deleteVerseGroup, updateVerseGroup, importTeluguData, bibleBooks } from '../../lib/db';
import VerseComponent from '../app-components/verse';
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
import { MoreHorizontal, CheckCircle, BookOpen, Languages, Globe, ChevronLeft, ChevronRight, Sun, Moon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

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
  const [theme, setTheme] = useState<'light' | 'dark'>(
    (localStorage.getItem('bibleTheme') as 'light' | 'dark') || 
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  );

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
    localStorage.setItem('bibleTheme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

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

  return (
    <div className={theme}>
      <div className="fixed left-0 top-1/2 transform -translate-y-1/2 z-20">
        <Button
          onClick={() => navigateChapter('previous')}
          disabled={book === bibleBooks.oldTestament[0] && chapter === 1}
          variant="outline"
          size="icon"
          className="flex-1"
          aria-label="Go to previous chapter"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
      </div>
      <div className="fixed right-0 top-1/2 transform -translate-y-1/2 z-20">
        <Button
          onClick={() => navigateChapter('next')}
          disabled={book === bibleBooks.newTestament[bibleBooks.newTestament.length - 1] && chapter === chapters[chapters.length - 1]}
          variant="outline"
          size="icon"
          className="flex-1"
          aria-label="Go to next chapter"
        >
          <ChevronRight className="w-6 h-6" />
        </Button>
      </div>
      <div className="sticky top-0 z-10">
        <div className="w-full px-4 py-4 ">
          <Card className="bg-white/30 dark:bg-neutral-900/30 backdrop-blur-xl border border-white/20 dark:border-neutral-800/40 rounded-lg shadow-sm">
            <CardContent className="pt-4 pb-4">
              <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold ">Bible Notes</h1>
                {/* <ToggleGroup
                  type="single"
                  value={theme}
                  onValueChange={(value: 'light' | 'dark') => value && setTheme(value)}
                  className="w-[100px] segmented-control"
                >
                  <ToggleGroupItem value="light" aria-label="Light theme" className="bg-card/80 text-foreground dark:bg-card/80 dark:text-foreground">
                    <Sun className="w-4 h-4 mr-1" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="dark" aria-label="Dark theme" className="bg-card/80 text-foreground dark:bg-card/80 dark:text-foreground">
                    <Moon className="w-4 h-4 mr-1" />
                  </ToggleGroupItem>
                </ToggleGroup> */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
                      <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
                      <span className="sr-only">Toggle theme</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setTheme("light")}>
                      Light
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("dark")}>
                      Dark
                    </DropdownMenuItem>
                    {/* <DropdownMenuItem onClick={() => setTheme("system")}>
                      System
                    </DropdownMenuItem> */}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {error && (
                <Alert variant="destructive" className="mb-4 border-none">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription >{error}</AlertDescription>
                </Alert>
              )}
              <div className="flex flex-wrap gap-4 items-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className='bg-white'>
                      {book || (isLoadingBooks ? 'Loading books...' : 'Select a book')}
                      <BookOpen className="w-4 h-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent >
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger >Old Testament</DropdownMenuSubTrigger>
                      <DropdownMenuSubContent >
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
                      <DropdownMenuSubTrigger >New Testament</DropdownMenuSubTrigger>
                      <DropdownMenuSubContent >
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
                  <SelectTrigger >
                    <SelectValue placeholder={isLoadingChapters ? 'Loading chapters...' : 'Select chapter'} />
                  </SelectTrigger>
                  <SelectContent>
                    {chapters.map((ch) => (
                      <SelectItem key={ch} value={ch.toString()} >
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
                  // className="w-[150px] segmented-control"
                >
                  <ToggleGroupItem value="English" aria-label="English" >
                     EN
                  </ToggleGroupItem>
                  <ToggleGroupItem value="Telugu" aria-label="Telugu" >
                     TE
                  </ToggleGroupItem>
                  <ToggleGroupItem value="Both" aria-label="Both" >
                     Both
                  </ToggleGroupItem>
                </ToggleGroup>
                {selectedVerses.length > 0 && (
                  <Button onClick={() => setIsGrouping(true)}>
                    Group Selected Verses
                  </Button>
                )}
              </div>
              <div className="flex gap-4 mt-4">
                <Button
                  onClick={() => navigateChapter('previous')}
                  disabled={book === bibleBooks.oldTestament[0] && chapter === 1}
                  variant="outline"
                  aria-label="Go to previous chapter"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Previous Chapter
                </Button>
                <Button
                  onClick={() => navigateChapter('next')}
                  disabled={book === bibleBooks.newTestament[bibleBooks.newTestament.length - 1] && chapter === chapters[chapters.length - 1]}
                  variant="outline"
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
      <div className="w-full px-4 pt-0">
        <div className="space-y-1">
          {verses.length === 0 ? (
            <p>No verses found for {book} {chapter}</p>
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
                    <div
                      key={`group-${group.id}`}
                      className={`p-4 rounded-lg shadow-md border-2 border-dashed ${selectedVerses.some(v => group.verseRefs.includes(v.toString())) ? '!border-solid !border-blue-500 bg-card dark:bg-card' : 'bg-card dark:bg-card'} verse-box`}
                      style={{ borderColor: group.borderColor }}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex gap-1 items-center">
                          <Badge variant="outline" >{book}</Badge>
                          <Badge variant="outline" >{chapter}</Badge>
                          <Badge variant="outline" >{verseRange}</Badge>
                          <span className="text-md font-bold text-foreground dark:text-foreground ml-2">{group.subheading}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" >
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => editGroup(group)} >
                                Edit Group
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => editGroupNotes(group)}>
                                Edit Group Notes
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setShowDeleteGroupDialog(group.id!)} >
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
                      <div className="text-md leading-relaxed space-y-2">
                        {groupVerses.map((groupVerse) => (
                          <div key={`${groupVerse.book_name}:${groupVerse.chapter}:${groupVerse.verse}`}>
                            
                            {(translation === 'English' || translation === 'Both') && (
                              <div className="p-3 bg-card rounded-md verse-box">
                                
                                {groupVerse.text || 'English translation not available'}
                              </div>
                            )}
                            {(translation === 'Telugu' || translation === 'Both') && translation === 'Both' && <hr className="border-border" />}
                            {(translation === 'Telugu' || translation === 'Both') && (
                              <div className="p-3 bg-card rounded-md font-noto-serif-telugu verse-box">
                                {/* <span className="font-bold">Telugu:</span>{' '} */}
                                {teluguTextMap.get(`${groupVerse.book_name}:${groupVerse.chapter}:${groupVerse.verse}`) || 'Telugu translation not available'}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      {group.notes && (
                        <div className="mt-2 p-2 bg-card rounded-md text-sm verse-box">
                          Group Notes: {group.notes}
                        </div>
                      )}
                    </div>
                  );
                  index += groupVerses.length;
                } else {
                  elements.push(
                    <VerseComponent
                      key={`${verse.book_name}:${verse.chapter}:${verse.verse}`}
                      verse={verse}
                      translation={translation}
                      teluguText={teluguTextMap.get(`${verse.book_name}:${verse.chapter}:${verse.verse}`)}
                      onSelect={() => toggleVerseSelection(verse.verse)}
                      onNavigate={navigateToVerse}
                      isGrouped={false}
                      isSelected={selectedVerses.includes(verse.verse)}
                    />
                  );
                  index++;
                }
              }

              return elements;
            })()
          )}
        </div>
        <div className="flex gap-4 mt-4">
          <Button
            onClick={() => navigateChapter('previous')}
            disabled={book === bibleBooks.oldTestament[0] && chapter === 1}
            variant="outline"
            className="flex-1"
            aria-label="Go to previous chapter"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous Chapter
          </Button>
          <Button
            onClick={() => navigateChapter('next')}
            disabled={book === bibleBooks.newTestament[bibleBooks.newTestament.length - 1] && chapter === chapters[chapters.length - 1]}
            variant="outline"
            className="flex-1"
            aria-label="Go to next chapter"
          >
            Next Chapter
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
      <Dialog open={isGrouping} onOpenChange={setIsGrouping}>
        <DialogContent>
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
            className="w-full mb-2"
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
          <Button onClick={createOrUpdateGroup} className="mt-4 bg-primary">
            {editingGroup ? 'Update Group' : 'Create Group'}
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog open={!!isEditingGroupNotes} onOpenChange={() => setIsEditingGroupNotes(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Group Notes</DialogTitle>
            <DialogDescription>
              Update the notes for the group: {isEditingGroupNotes?.subheading}.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={groupNotes}
            onChange={(e) => setGroupNotes(e.target.value)}
            placeholder="Group notes..."
            className="w-full mb-2"
          />
          <Button
            onClick={() => isEditingGroupNotes && updateGroupNotes(isEditingGroupNotes, groupNotes)}
            className="mt-4"
          >
            Update Notes
          </Button>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!showDeleteGroupDialog} onOpenChange={() => setShowDeleteGroupDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <DialogTitle>Delete Group</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this group?
            </DialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteGroup(showDeleteGroupDialog as string)} >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}