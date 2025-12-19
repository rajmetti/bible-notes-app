'use client';

import { useState, useEffect, useRef, JSX } from 'react';
import { db, Verse as VerseType, Note, Highlight, VerseLink, DrawNote, TextAnnotation, deleteHighlight, deleteNote, deleteDrawNote, deleteTextAnnotation } from '../../lib/db';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { MoreHorizontal, Pencil, Highlighter, Link, Paintbrush, Trash, CheckCircle } from 'lucide-react';
import { ChromePicker } from 'react-color';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

interface VerseProps {
  verse: VerseType;
  translation: 'English' | 'Telugu' | 'Both';
  teluguText?: string;
  onSelect?: (verseNumber: number) => void;
  onNavigate?: (verseRef: string) => void;
  isGrouped?: boolean;
  isSelected?: boolean;
  onOpenNoteDrawer?: (verseRef: string, initialNote: string) => void;
}

export function Verse({
                        verse,
                        translation,
                        teluguText,
                        onSelect,
                        onNavigate,
                        isGrouped,
                        isSelected,
                        onOpenNoteDrawer
                      }: VerseProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [verseLinks, setVerseLinks] = useState<VerseLink[]>([]);
  const [drawNotes, setDrawNotes] = useState<DrawNote[]>([]);
  const [textAnnotations, setTextAnnotations] = useState<TextAnnotation[]>([]);
  const [isHighlighting, setIsHighlighting] = useState<boolean>(false);
  const [highlightColor, setHighlightColor] = useState<string>('#000000');
  const [isLinkingVerse, setIsLinkingVerse] = useState<boolean>(false);
  const [targetVerseRef, setTargetVerseRef] = useState<string>('');
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showRemoveHighlightDialog, setShowRemoveHighlightDialog] = useState<string | null>(null);
  const [showRemoveNoteDialog, setShowRemoveNoteDialog] = useState<string | null>(null);
  const [showRemoveDrawNoteDialog, setShowRemoveDrawNoteDialog] = useState<string | null>(null);
  const [showRemoveTextAnnotationDialog, setShowRemoveTextAnnotationDialog] = useState<string | null>(null);
  const [isAnnotatingText, setIsAnnotatingText] = useState<boolean>(false);
  const [selectedTextRange, setSelectedTextRange] = useState<{ start: number; end: number } | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<'English' | 'Telugu' | null>(null);
  const [annotationStyle, setAnnotationStyle] = useState<{
    color?: string;
    underlineType?: 'solid' | 'dotted' | 'dashed' | 'wavy';
    bold?: boolean;
    italic?: boolean;
    fontFamily?: string;
  }>({color: '#000000', underlineType: 'solid', bold: false, italic: false, fontFamily: 'Arial'});
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [pendingTextSelection, setPendingTextSelection] = useState<{
    range: Range;
    language: 'English' | 'Telugu';
  } | null>(null);
  const [activeTextSelection, setActiveTextSelection] = useState<{
    range: Range;
    language: 'English' | 'Telugu';
  } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const englishTextRef = useRef<HTMLSpanElement>(null);
  const teluguTextRef = useRef<HTMLSpanElement>(null);
  const verseRowRef = useRef<HTMLTableRowElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  const verseRef = `${verse.book_name}:${verse.chapter}:${verse.verse}`;
  const sanitizedVerseRef = verseRef.replace(/:/g, '-');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const fetchedNotes = await db.notes.where('verseRef').equals(verseRef).toArray();
        setNotes(fetchedNotes);
        const fetchedHighlights = await db.highlights.where('verseRef').equals(verseRef).toArray();
        setHighlights(fetchedHighlights);
        const fetchedLinks = await db.verseLinks.where('sourceRef').equals(verseRef).toArray();
        setVerseLinks(fetchedLinks);
        const fetchedDrawNotes = await db.drawNotes.where('verseRef').equals(verseRef).toArray();
        setDrawNotes(fetchedDrawNotes);
        const fetchedAnnotations = await db.textAnnotations.where('verseRef').equals(verseRef).toArray();
        setTextAnnotations(fetchedAnnotations);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load verse data.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [verseRef]);

  useEffect(() => {
    if (verseRowRef.current && !isLoading) {
      import('animejs').then(({animate, stagger}) => {
        animate(verseRowRef.current, {
          opacity: [0, 1],
          translateY: ['10px', '0px'],
          duration: 600,
          ease: 'outQuad',
          delay: stagger('100ms', {start: verse.verse * 100}),
        });
      });
    }
  }, [verse.verse, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      const dialogs = document.querySelectorAll('.dialog-content');
      import('animejs').then(({animate}) => {
        animate(dialogs, {
          scale: [0.95, 1],
          opacity: [0, 1],
          duration: 300,
          ease: 'outQuad',
        });
      });
    }
  }, [isHighlighting, isAnnotatingText, isLinkingVerse, isDrawing, showRemoveHighlightDialog, showRemoveNoteDialog, showRemoveDrawNoteDialog, showRemoveTextAnnotationDialog, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      const checkbox = document.querySelector(`#checkbox-${sanitizedVerseRef}`);
      if (checkbox && isSelected !== undefined) {
        import('animejs').then(({animate}) => {
          animate(`#checkbox-${sanitizedVerseRef}`, {
            scale: isSelected ? [0.8, 1] : [1, 0.8],
            opacity: [0.7, 1],
            duration: 200,
            ease: 'outQuad',
          });
        });
      }
    }
  }, [isSelected, sanitizedVerseRef, isLoading]);

  const addNote = async (noteContent: string) => {
    if (!noteContent.trim()) {
      setError('Note cannot be empty.');
      return;
    }
    const note: Note = {
      verseRef,
      content: noteContent,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    try {
      await db.notes.put(note);
      setNotes([...notes, note]);
      setError(null);
      onOpenNoteDrawer?.(verseRef, noteContent);
    } catch (error) {
      console.error('Error saving note:', error);
      setError('Failed to save note.');
    }
  };

  const addHighlight = async () => {
    const highlights: Highlight[] = [
      {
        verseRef,
        color: highlightColor,
        language: 'English',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        verseRef,
        color: highlightColor,
        language: 'Telugu',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];
    try {
      await db.highlights.bulkPut(highlights);
      setHighlights([...highlights, ...highlights]);
      setIsHighlighting(false);
      setError(null);
    } catch (error) {
      console.error('Error saving highlights:', error);
      setError('Failed to save highlights.');
    }
  };

  const removeHighlight = async (id: string) => {
    try {
      await deleteHighlight(id);
      setHighlights(highlights.filter((h) => h.id !== id));
      setShowRemoveHighlightDialog(null);
      setError(null);
    } catch (error) {
      console.error('Error removing highlight:', error);
      setError('Failed to remove highlight.');
    }
  };

  const removeNote = async (id: string) => {
    try {
      await deleteNote(id);
      setNotes(notes.filter((n) => n.id !== id));
      setShowRemoveNoteDialog(null);
      setError(null);
    } catch (error) {
      console.error('Error removing note:', error);
      setError('Failed to remove note.');
    }
  };

  const removeDrawNote = async (id: string) => {
    try {
      await deleteDrawNote(id);
      setDrawNotes(drawNotes.filter((d) => d.id !== id));
      setShowRemoveDrawNoteDialog(null);
      setError(null);
    } catch (error) {
      console.error('Error removing draw note:', error);
      setError('Failed to remove draw note.');
    }
  };

  const removeTextAnnotation = async (id: string) => {
    try {
      await deleteTextAnnotation(id);
      setTextAnnotations(textAnnotations.filter((a) => a.id !== id));
      setShowRemoveTextAnnotationDialog(null);
      setError(null);
    } catch (error) {
      console.error('Error removing text annotation:', error);
      setError('Failed to remove text annotation.');
    }
  };

  const addVerseLink = async () => {
    if (!targetVerseRef.match(/^[A-Za-z]+:\d+:\d+$/)) {
      setError('Invalid verse reference format (e.g., John:3:16).');
      return;
    }
    const link: VerseLink = {
      sourceRef: verseRef,
      targetRef: targetVerseRef,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    try {
      await db.verseLinks.put(link);
      setVerseLinks([...verseLinks, link]);
      setTargetVerseRef('');
      setIsLinkingVerse(false);
      setError(null);
    } catch (error) {
      console.error('Error saving verse link:', error);
      setError('Failed to save verse link.');
    }
  };

  const initCanvas = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    let isDrawing = false;

    canvas.addEventListener('mousedown', (e) => {
      isDrawing = true;
      const rect = canvas.getBoundingRect();
      ctx.beginPath();
      ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    });
    canvas.addEventListener('mousemove', (e) => {
      if (!isDrawing) return;
      const rect = canvas.getBoundingRect();
      ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.stroke();
    });
    canvas.addEventListener('mouseup', () => (isDrawing = false));
    canvas.addEventListener('mouseout', () => (isDrawing = false));
  };

  const saveDrawing = async () => {
    if (!canvasRef.current) return;
    const data = canvasRef.current.toDataURL();
    const drawNote: DrawNote = {
      verseRef,
      data,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    try {
      await db.drawNotes.put(drawNote);
      setDrawNotes([...drawNotes, drawNote]);
      setIsDrawing(false);
      setError(null);
    } catch (error) {
      console.error('Error saving draw note:', error);
      setError('Failed to save drawn note.');
    }
  };

  const handleTextSelection = (language: 'English' | 'Telugu') => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const ref = language === 'English' ? englishTextRef : teluguTextRef;
      const parentElement = ref.current;
      if (parentElement && selection.getRangeAt(0).startContainer.parentElement?.closest(`[data-language="${language}"]`)) {
        const range = selection.getRangeAt(0);
        const start = range.startOffset;
        const end = range.endOffset;
        setActiveTextSelection({
          range: range.cloneRange(),
          language
        })
        if (start !== end) {
          setSelectedTextRange({start, end});
          return language;
        }
      }
    }
    setSelectedTextRange(null);
    return null;
  };

  // const handleAnnotateText = () => {
  //   const language = handleTextSelection('English') || handleTextSelection('Telugu');
  //   if (language) {
  //     setIsAnnotatingText(true);
  //     setSelectedLanguage(language);
  //     setAnnotationStyle({ ...annotationStyle });
  //   } else {
  //     setError('Please select some text in the verse to annotate.');
  //   }
  // };
  const handleAnnotateText = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      if (activeTextSelection) {
        setIsAnnotatingText(true);
        setSelectedLanguage(activeTextSelection.language);
        setSelectedTextRange({
          start: activeTextSelection.range.startOffset,
          end: activeTextSelection.range.endOffset,
        });
        // Restore visual selection briefly for UX
        // selection.removeAllRanges();
        // selection.addRange(pendingTextSelection.range);
      } else {
        setError('Please select some text in the verse to annotate.');
      }
      return;
    }

    const range = selection.getRangeAt(0);
    let language: 'English' | 'Telugu' | null = null;

    if (englishTextRef.current?.contains(range.commonAncestorContainer)) {
      language = 'English';
    } else if (teluguTextRef.current?.contains(range.commonAncestorContainer)) {
      language = 'Telugu';
    }

    if (language && !selection.isCollapsed) {
      setPendingTextSelection({range: range.cloneRange(), language});
      setSelectedLanguage(language);
      setSelectedTextRange({
        start: range.startOffset,
        end: range.endOffset,
      });
      setIsAnnotatingText(true);
    } else {
      setError('Please select valid text within the verse.');
    }

    // Clear selection only after capturing
    selection.removeAllRanges();
  };

  const addTextAnnotation = async () => {
    if (!selectedTextRange || !selectedLanguage) {
      setError('No text selected or language not specified.');
      return;
    }
    const annotation: TextAnnotation = {
      verseRef,
      start: selectedTextRange.start,
      end: selectedTextRange.end,
      style: {...annotationStyle},
      language: selectedLanguage,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    try {
      await db.textAnnotations.put(annotation);
      setTextAnnotations([...textAnnotations, annotation]);
      setIsAnnotatingText(false);
      setSelectedTextRange(null);
      setSelectedLanguage(null);
      setError(null);
      window.getSelection()?.removeAllRanges();
    } catch (error) {
      console.error('Error saving text annotation:', error);
      setError('Failed to save text annotation.');
    }
  };

  const renderAnnotatedText = (text: string, language: 'English' | 'Telugu', textRef: React.RefObject<HTMLSpanElement>) => {
    const annotations = textAnnotations.filter((a) => a.language === language);
    const highlight = highlights.find((h) => h.language === language);

    if (annotations.length === 0 && !highlight) {
      return (
          <span
              ref={textRef}
              data-language={language}
              onMouseUp={() => handleTextSelection(language)}
              onTouchEnd={() => handleTextSelection(language)}
          >
          {text}
        </span>
      );
    }

    const sortedAnnotations = [...annotations].sort((a, b) => a.start - b.start);
    let lastIndex = 0;
    const elements: JSX.Element[] = [];

    if (highlight) {
      sortedAnnotations.forEach((annotation, index) => {
        if (annotation.start > lastIndex) {
          elements.push(
              <span
                  key={`text-${lastIndex}`}
                  style={{backgroundColor: highlight.color}}
                  data-language={language}
                  onMouseUp={() => handleTextSelection(language)}
                  onTouchEnd={() => handleTextSelection(language)}
              >
              {text.slice(lastIndex, annotation.start)}
            </span>
          );
        }
        const style: React.CSSProperties = {
          textDecoration: annotation.style.underlineType ? `underline ${annotation.style.underlineType}` : undefined,
          fontWeight: annotation.style.bold ? 'bold' : undefined,
          fontStyle: annotation.style.italic ? 'italic' : undefined,
          fontFamily: annotation.style.fontFamily,
          color: annotation.style.color,
        };
        elements.push(
            <span
                key={`annotation-${index}`}
                style={style}
                className="annotation-text"
                data-language={language}
                onMouseUp={() => handleTextSelection(language)}
                onTouchEnd={() => handleTextSelection(language)}
            >
            {text.slice(annotation.start, annotation.end)}
          </span>
        );
        lastIndex = annotation.end;
      });

      if (lastIndex < text.length) {
        elements.push(
            <span
                key={`text-${lastIndex}`}
                style={{backgroundColor: highlight.color}}
                data-language={language}
                onMouseUp={() => handleTextSelection(language)}
                onTouchEnd={() => handleTextSelection(language)}
            >
            {text.slice(lastIndex)}
          </span>
        );
      }
    } else {
      sortedAnnotations.forEach((annotation, index) => {
        if (annotation.start > lastIndex) {
          elements.push(
              <span
                  key={`text-${lastIndex}`}
                  data-language={language}
                  onMouseUp={() => handleTextSelection(language)}
                  onTouchEnd={() => handleTextSelection(language)}
              >
              {text.slice(lastIndex, annotation.start)}
            </span>
          );
        }
        const style: React.CSSProperties = {
          textDecoration: annotation.style.underlineType ? `underline ${annotation.style.underlineType}` : undefined,
          fontWeight: annotation.style.bold ? 'bold' : undefined,
          fontStyle: annotation.style.italic ? 'italic' : undefined,
          fontFamily: annotation.style.fontFamily,
          color: annotation.style.color,
        };
        elements.push(
            <span
                key={`annotation-${index}`}
                style={style}
                className="annotation-text"
                data-language={language}
                onMouseUp={() => handleTextSelection(language)}
                onTouchEnd={() => handleTextSelection(language)}
            >
            {text.slice(annotation.start, annotation.end)}
          </span>
        );
        lastIndex = annotation.end;
      });

      if (lastIndex < text.length) {
        elements.push(
            <span
                key={`text-${lastIndex}`}
                data-language={language}
                onMouseUp={() => handleTextSelection(language)}
                onTouchEnd={() => handleTextSelection(language)}
            >
            {text.slice(lastIndex)}
          </span>
        );
      }
    }

    return <span ref={textRef}>{elements}</span>;
  };

  if (isLoading) {
    return (
        <div className="py-1 px-4 max-w-screen-2xl mx-auto">
          <table className="verse-table">
            <tbody>
            <tr className={`verse-row ${isGrouped ? 'ml-4' : ''}`}>
              <td className="verse-number">
                <div className="flex gap-1">
                  <Skeleton className="h-6 w-16"/>
                  <Skeleton className="h-6 w-12"/>
                </div>
              </td>
              <td className="verse-text">
                <Skeleton className="h-4 w-[80%] mb-2"/>
                {translation === 'Both' && <Skeleton className="h-4 w-[80%]"/>}
              </td>
              <td className="verse-actions">
                <div className="verse-actions-container">
                  <Skeleton className="h-5 w-5"/>
                  <Skeleton className="h-5 w-5"/>
                </div>
              </td>
            </tr>
            </tbody>
          </table>
        </div>
    );
  }

  return (
      <div className="py-1 px-4 max-w-screen-2xl mx-auto">
        <table className="verse-table">
          <tbody>
          <tr ref={verseRowRef} className={`verse-row ${isGrouped ? 'ml-4' : ''} ${isSelected ? 'bg-primary/10' : ''}`}>
            <td className="verse-number">
              <div className="flex gap-1">
                <Badge
                    variant="outline"
                    className={`cursor-pointer ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                    onClick={() => onNavigate?.(verseRef)}
                    aria-label={`${verse.book_name} ${verse.chapter}:${verse.verse}`}
                >
                  {verse.book_name}
                </Badge>
                <Badge
                    variant="outline"
                    className={`cursor-pointer ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                    onClick={() => onNavigate?.(verseRef)}
                    aria-label={`${verse.book_name} ${verse.chapter}:${verse.verse}`}
                >
                  {verse.chapter}:{verse.verse}
                </Badge>
              </div>
            </td>
            <td className="verse-text">
              {translation === 'English' || translation === 'Both' ? (
                  <div className="text-sm font-noto-serif-english">
                    {verse.text ? renderAnnotatedText(verse.text, 'English', englishTextRef) : 'No English text available'}
                  </div>
              ) : null}
              {translation === 'Telugu' || translation === 'Both' ? (
                  <div className="text-sm font-noto-serif-telugu">
                    {teluguText ? renderAnnotatedText(teluguText, 'Telugu', teluguTextRef) : 'No Telugu text available'}
                  </div>
              ) : null}
              {(notes.length > 0 || verseLinks.length > 0 || drawNotes.length > 0) && (
                  <div className="space-y-1 text-sm mt-1">
                    {notes.map((note) => (
                        <div key={note.id} className="bg-muted p-1 rounded-md">
                          {note.content}
                        </div>
                    ))}
                    {verseLinks.map((link) => (
                        <div key={link.id}>
                          Linked to:{' '}
                          <button
                              className="hover:underline text-primary"
                              onClick={() => onNavigate?.(link.targetRef)}
                          >
                            {link.targetRef}
                          </button>
                        </div>
                    ))}
                    {drawNotes.map((drawNote) => (
                        <img
                            key={drawNote.id}
                            src={drawNote.data}
                            alt="Drawn note"
                            className="w-24 h-24 object-contain rounded-md"
                        />
                    ))}
                  </div>
              )}
            </td>
            <td className="verse-actions">
              <div className="verse-actions-container">
                {isGrouped ? (
                    <CheckCircle className="w-5 h-5 text-green-500"/>
                ) : (
                    <Checkbox
                        id={`checkbox-${sanitizedVerseRef}`}
                        checked={isSelected}
                        onCheckedChange={() => onSelect?.(verse.verse)}
                        className="border-border w-5 h-5"
                        aria-label={`Select verse ${verse.verse}`}
                    />
                )}
                <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-primary hover:scale-105 transition-transform"
                    >
                      <MoreHorizontal className="w-5 h-5"/>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-card">
                    <DropdownMenuItem onClick={() => onOpenNoteDrawer?.(verseRef, '')}>
                      <Pencil className="w-4 h-4 mr-2"/> Add Note
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsHighlighting(true)}>
                      <Highlighter className="w-4 h-4 mr-2"/> Highlight Verse
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleAnnotateText}>
                      <Highlighter className="w-4 h-4 mr-2"/> Annotate Text
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsLinkingVerse(true)}>
                      <Link className="w-4 h-4 mr-2"/> Link to Verse
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsDrawing(true)}>
                      <Paintbrush className="w-4 h-4 mr-2"/> Draw Note
                    </DropdownMenuItem>
                    {highlights.length > 0 && (
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <Trash className="w-4 h-4 mr-2"/> Remove Highlight
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            {highlights.map((highlight) => (
                                <DropdownMenuItem
                                    key={highlight.id}
                                    onClick={() => setShowRemoveHighlightDialog(highlight.id!)}
                                >
                                  Remove {highlight.color} ({highlight.language})
                                </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                    )}
                    {notes.length > 0 && (
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <Trash className="w-4 h-4 mr-2"/> Remove Note
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            {notes.map((note) => (
                                <DropdownMenuItem
                                    key={note.id}
                                    onClick={() => setShowRemoveNoteDialog(note.id!)}
                                >
                                  Remove: {note.content.substring(0, 20)}...
                                </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                    )}
                    {verseLinks.length > 0 && (
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <Trash className="w-4 h-4 mr-2"/> Remove Link
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            {verseLinks.map((link) => (
                                <DropdownMenuItem
                                    key={link.id}
                                    onClick={() => db.verseLinks.delete(link.id!)}
                                >
                                  Remove: {link.targetRef}
                                </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                    )}
                    {drawNotes.length > 0 && (
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <Trash className="w-4 h-4 mr-2"/> Remove Drawing
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            {drawNotes.map((drawNote) => (
                                <DropdownMenuItem
                                    key={drawNote.id}
                                    onClick={() => setShowRemoveDrawNoteDialog(drawNote.id!)}
                                >
                                  Remove Drawing
                                </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                    )}
                    {textAnnotations.length > 0 && (
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <Trash className="w-4 h-4 mr-2"/> Remove Text Annotation
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            {textAnnotations.map((annotation) => (
                                <DropdownMenuItem
                                    key={annotation.id}
                                    onClick={() => setShowRemoveTextAnnotationDialog(annotation.id!)}
                                >
                                  Remove: {(translation === 'English' || translation === 'Both' ? verse.text : teluguText || '').slice(annotation.start, annotation.end)} ({annotation.language})
                                </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </td>
          </tr>
          </tbody>
        </table>
        {error && (
            <Alert variant="destructive" className="mt-1 px-4 max-w-screen-2xl mx-auto">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}
        <Dialog open={isHighlighting} onOpenChange={setIsHighlighting}>
          <DialogContent className="bg-card dialog-content">
            <DialogHeader>
              <DialogTitle>Highlight Verse</DialogTitle>
              <DialogDescription>
                Choose a color to highlight {verse.book_name} {verse.chapter}:{verse.verse} in both English and Telugu.
              </DialogDescription>
            </DialogHeader>
            <ChromePicker
                color={highlightColor}
                onChange={(color) => setHighlightColor(color.hex)}
                disableAlpha
            />
            <Button
                onClick={addHighlight}
                className="mt-4 bg-primary text-primary-foreground"
            >
              Apply Highlight
            </Button>
          </DialogContent>
        </Dialog>
        <Dialog
            open={isAnnotatingText}
            onOpenChange={(open) => {
              setIsAnnotatingText(open);
              if (!open) {
                setSelectedTextRange(null);
                setSelectedLanguage(null);
                window.getSelection()?.removeAllRanges();
              }
            }}
        >
          <DialogContent className="bg-card dialog-content">
            <DialogHeader>
              <DialogTitle>Annotate Text</DialogTitle>
              <DialogDescription>
                {selectedTextRange
                    ? `Annotate selected text in ${verse.book_name} ${verse.chapter}:${verse.verse} for ${selectedLanguage}.`
                    : 'Select text in the verse to annotate.'}
              </DialogDescription>
            </DialogHeader>
            {selectedTextRange && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Highlight Color</label>
                    <ChromePicker
                        color={annotationStyle.color}
                        onChange={(color) => setAnnotationStyle({...annotationStyle, color: color.hex})}
                        disableAlpha
                    />
                    <label className="text-sm font-medium">Underline Type</label>
                    <Select
                        value={annotationStyle.underlineType || 'solid'}
                        onValueChange={(value) =>
                            setAnnotationStyle({
                              ...annotationStyle,
                              underlineType: value as 'solid' | 'dotted' | 'dashed' | 'wavy'
                            })
                        }
                    >
                      <SelectTrigger className="bg-card">
                        <SelectValue/>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solid">Solid</SelectItem>
                        <SelectItem value="dotted">Dotted</SelectItem>
                        <SelectItem value="dashed">Dashed</SelectItem>
                        <SelectItem value="wavy">Wavy</SelectItem>
                      </SelectContent>
                    </Select>
                    <label className="text-sm font-medium">Font Style</label>
                    <div className="flex gap-2">
                      <Button
                          variant={annotationStyle.bold ? 'default' : 'outline'}
                          onClick={() => setAnnotationStyle({...annotationStyle, bold: !annotationStyle.bold})}
                          size="sm"
                          className={annotationStyle.bold ? 'bg-primary text-primary-foreground' : 'bg-card'}
                      >
                        Bold
                      </Button>
                      <Button
                          variant={annotationStyle.italic ? 'default' : 'outline'}
                          onClick={() => setAnnotationStyle({...annotationStyle, italic: !annotationStyle.italic})}
                          size="sm"
                          className={annotationStyle.italic ? 'bg-primary text-primary-foreground' : 'bg-card'}
                      >
                        Italic
                      </Button>
                    </div>
                    <label className="text-sm font-medium">Font Family</label>
                    <Select
                        value={annotationStyle.fontFamily || 'Arial'}
                        onValueChange={(value) => setAnnotationStyle({...annotationStyle, fontFamily: value})}
                    >
                      <SelectTrigger className="bg-card">
                        <SelectValue/>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Arial">Arial</SelectItem>
                        <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                        <SelectItem value="Georgia">Georgia</SelectItem>
                        <SelectItem value="Courier New">Courier New</SelectItem>
                        <SelectItem value="Noto Serif Telugu">Noto Serif Telugu</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                      onClick={addTextAnnotation}
                      className="mt-4 bg-primary text-primary-foreground"
                  >
                    Apply Annotation
                  </Button>
                </>
            )}
          </DialogContent>
        </Dialog>
        <Dialog open={isLinkingVerse} onOpenChange={setIsLinkingVerse}>
          <DialogContent className="bg-card dialog-content">
            <DialogHeader>
              <DialogTitle>Link to Another Verse</DialogTitle>
              <DialogDescription>
                Enter a verse reference (e.g., John:3:16) to link from {verse.book_name} {verse.chapter}:{verse.verse}.
              </DialogDescription>
            </DialogHeader>
            <Input
                value={targetVerseRef}
                onChange={(e) => setTargetVerseRef(e.target.value)}
                placeholder="Enter verse (e.g., John:3:16)"
                className="bg-card"
            />
            <Button
                onClick={addVerseLink}
                className="mt-4 bg-primary text-primary-foreground"
            >
              Save Link
            </Button>
          </DialogContent>
        </Dialog>
        <Dialog open={isDrawing} onOpenChange={setIsDrawing}>
          <DialogContent className="bg-card dialog-content">
            <DialogHeader>
              <DialogTitle>Draw Note</DialogTitle>
              <DialogDescription>
                Draw a note for {verse.book_name} {verse.chapter}:{verse.verse} using the canvas below.
              </DialogDescription>
            </DialogHeader>
            <canvas
                ref={(el) => {
                  if (el && !canvasRef.current) {
                    canvasRef.current = el;
                    initCanvas(el);
                  }
                }}
                width={300}
                height={200}
                className="border border-border rounded-md"
            />
            <div className="flex gap-2 mt-4">
              <Button
                  onClick={saveDrawing}
                  size="sm"
                  className="bg-primary text-primary-foreground"
              >
                Save Drawing
              </Button>
              <Button
                  variant="outline"
                  size="sm"
                  className="bg-card"
                  onClick={() => setIsDrawing(false)}
              >
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <AlertDialog open={!!showRemoveHighlightDialog} onOpenChange={() => setShowRemoveHighlightDialog(null)}>
          <AlertDialogContent className="bg-card dialog-content">
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Highlight</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove this highlight from {verse.book_name} {verse.chapter}:{verse.verse}?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-card">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                  onClick={() => removeHighlight(showRemoveHighlightDialog as string)}
                  className="bg-primary text-primary-foreground"
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog open={!!showRemoveNoteDialog} onOpenChange={() => setShowRemoveNoteDialog(null)}>
          <AlertDialogContent className="bg-card dialog-content">
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Note</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove this note from {verse.book_name} {verse.chapter}:${verse.verse}?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-card">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                  onClick={() => removeNote(showRemoveNoteDialog as string)}
                  className="bg-primary text-primary-foreground"
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog open={!!showRemoveDrawNoteDialog} onOpenChange={() => setShowRemoveDrawNoteDialog(null)}>
          <AlertDialogContent className="bg-card dialog-content">
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Drawing</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove this drawing from {verse.book_name} {verse.chapter}:${verse.verse}?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-card">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                  onClick={() => removeDrawNote(showRemoveDrawNoteDialog as string)}
                  className="bg-primary text-primary-foreground"
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog open={!!showRemoveTextAnnotationDialog}
                     onOpenChange={() => setShowRemoveTextAnnotationDialog(null)}>
          <AlertDialogContent className="bg-card dialog-content">
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Text Annotation</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove this text annotation
                from {verse.book_name} {verse.chapter}:${verse.verse}?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-card">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                  onClick={() => removeTextAnnotation(showRemoveTextAnnotationDialog as string)}
                  className="bg-primary text-primary-foreground"
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
  );
}