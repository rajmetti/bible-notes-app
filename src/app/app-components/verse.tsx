'use client';

import { useState, useEffect, useRef, JSX } from 'react';
import { useTheme } from 'next-themes';
import { db, Verse as VerseType, Note, Highlight, VerseLink, DrawNote, TextAnnotation, deleteHighlight, deleteNote, deleteDrawNote, deleteTextAnnotation } from '../../lib/db';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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

interface VerseProps {
  verse: VerseType;
  translation: 'English' | 'Telugu' | 'Both';
  teluguText?: string;
  onSelect?: (verseNumber: number) => void;
  onNavigate?: (verseRef: string) => void;
  isGrouped?: boolean;
  isSelected?: boolean;
}

export default function Verse({ verse, translation, teluguText, onSelect, onNavigate, isGrouped, isSelected }: VerseProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [notes, setNotes] = useState<Note[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [verseLinks, setVerseLinks] = useState<VerseLink[]>([]);
  const [drawNotes, setDrawNotes] = useState<DrawNote[]>([]);
  const [textAnnotations, setTextAnnotations] = useState<TextAnnotation[]>([]);
  const [isAddingNote, setIsAddingNote] = useState<boolean>(false);
  const [newNote, setNewNote] = useState<string>('');
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
  }>({ color: '#000000', underlineType: 'solid', bold: false, italic: false, fontFamily: 'Arial' });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const englishTextRef = useRef<HTMLSpanElement>(null);
  const teluguTextRef = useRef<HTMLSpanElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const verseRef = `${verse.book_name}:${verse.chapter}:${verse.verse}`;
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
      }
    };
    fetchData();
  }, [verse]);

  const addNote = async () => {
    if (!newNote.trim()) {
      setError('Note cannot be empty.');
      return;
    }
    const note: Note = {
      verseRef: `${verse.book_name}:${verse.chapter}:${verse.verse}`,
      content: newNote,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    try {
      await db.notes.put(note);
      setNotes([...notes, note]);
      setNewNote('');
      setIsAddingNote(false);
      setError(null);
    } catch (error) {
      console.error('Error saving note:', error);
      setError('Failed to save note.');
    }
  };

  const addHighlight = async () => {
    const verseRef = `${verse.book_name}:${verse.chapter}:${verse.verse}`;
    const highlightColorValue = highlightColor;
    const highlights: Highlight[] = [
      {
        verseRef,
        color: highlightColorValue,
        language: 'English',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        verseRef,
        color: highlightColorValue,
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
      sourceRef: `${verse.book_name}:${verse.chapter}:${verse.verse}`,
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
    ctx.fillStyle = isDarkMode ? '#1F1F1F' : '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    let isDrawing = false;

    canvas.addEventListener('mousedown', () => {
      isDrawing = true;
      ctx.beginPath();
    });
    canvas.addEventListener('mousemove', (e) => {
      if (!isDrawing) return;
      const rect = canvas.getBoundingClientRect();
      ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
      ctx.strokeStyle = isDarkMode ? '#FFFFFF' : '#000000';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
    canvas.addEventListener('mouseup', () => (isDrawing = false));
    canvas.addEventListener('mouseout', () => (isDrawing = false));
  };

  const saveDrawing = async () => {
    if (!canvasRef.current) return;
    const data = canvasRef.current.toDataURL();
    const drawNote: DrawNote = {
      verseRef: `${verse.book_name}:${verse.chapter}:${verse.verse}`,
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
        if (start !== end) {
          setSelectedTextRange({ start, end });
          return language;
        }
      }
    }
    setSelectedTextRange(null);
    return null;
  };

  const handleAnnotateText = () => {
    const language = handleTextSelection('English') || handleTextSelection('Telugu');
    if (language) {
      setIsAnnotatingText(true);
      setSelectedLanguage(language);
      setAnnotationStyle({ ...annotationStyle});
    } else {
      setError('Please select some text in the verse to annotate.');
    }
  };

  const addTextAnnotation = async () => {
    if (!selectedTextRange || !selectedLanguage) {
      setError('No text selected or language not specified.');
      return;
    }
    const verseRef = `${verse.book_name}:${verse.chapter}:${verse.verse}`;
    const annotationColor = isDarkMode ? '#FFFFFF' : '#000000';
    const annotation: TextAnnotation = {
      verseRef,
      start: selectedTextRange.start,
      end: selectedTextRange.end,
      style: { ...annotationStyle, color: annotationColor },
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
              className="highlight-bg"
              style={{ backgroundColor: highlight.color }}
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
          color: annotation.style.color || (isDarkMode ? '#FFFFFF' : '#000000'),
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
            className="highlight-bg"
            style={{ backgroundColor: highlight.color }}
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
          color: annotation.style.color || (isDarkMode ? '#FFFFFF' : '#000000'),
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

  return (
    <div className="py-1 ">
      <div
        className={`flex flex-col gap-2 rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow duration-200 border border-border ${
          isSelected && !isGrouped ? '!border-blue-500' : ''
        }`}
      >
        <div className="flex justify-between items-center">
          <div className="flex gap-1">
            <Badge
              variant="outline"
              onClick={() => onNavigate && onNavigate(`${verse.book_name}:${verse.chapter}:${verse.verse}`)}
              aria-label={`${verse.book_name} ${verse.chapter}:${verse.verse}`}
            >
              {verse.book_name}
            </Badge>
            <Badge
              variant="outline"
              onClick={() => onNavigate && onNavigate(`${verse.book_name}:${verse.chapter}:${verse.verse}`)}
              aria-label={`${verse.book_name} ${verse.chapter}:${verse.verse}`}
            >
              {verse.chapter}
            </Badge>
            <Badge
              variant="outline"
              onClick={() => onNavigate && onNavigate(`${verse.book_name}:${verse.chapter}:${verse.verse}`)}
              aria-label={`${verse.book_name} ${verse.chapter}:${verse.verse}`}
            >
              {verse.verse}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {isGrouped ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onSelect && onSelect(verse.verse)}
                aria-label={`Select verse ${verse.verse}`}
              />
            )}
            <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setIsAddingNote(true)} >
                  <Pencil className="w-4 h-4 mr-2" />
                  Add Note
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsHighlighting(true)}>
                  <Highlighter className="w-4 h-4 mr-2" />
                  Highlight Verse
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleAnnotateText}>
                  <Highlighter className="w-4 h-4 mr-2" />
                  Annotate Text
                </DropdownMenuItem>
                {highlights.length > 0 && (
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger >
                      <Trash className="w-4 h-4 mr-2" />
                      Remove Highlight
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent >
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
                {textAnnotations.length > 0 && (
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger >
                      <Trash className="w-4 h-4 mr-2" />
                      Remove Text Annotation
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {textAnnotations.map((annotation) => (
                        <DropdownMenuItem
                          key={annotation.id}
                          onClick={() => setShowRemoveTextAnnotationDialog(annotation.id!)}
                          
                        >
                          Remove: {verse.text.slice(annotation.start, annotation.end)} ({annotation.language})
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                )}
                <DropdownMenuItem onClick={() => setIsLinkingVerse(true)}>
                  <Link className="w-4 h-4 mr-2" />
                  Link to Verse
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsDrawing(true)}>
                  <Paintbrush className="w-4 h-4 mr-2" />
                  Draw Note
                </DropdownMenuItem>
                {notes.length > 0 && (
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Trash className="w-4 h-4 mr-2" />
                      Remove Note
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent >
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
                {drawNotes.length > 0 && (
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger >
                      <Trash className="w-4 h-4 mr-2" />
                      Remove Drawing
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent >
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
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="text-md leading-relaxed space-y-2">
          {(translation === 'English' || translation === 'Both') && (
            <div className="p-3 ">
              {/* <span className={`font-bold`}>English (ASV):</span>{' '} */}
              {verse.text ? renderAnnotatedText(verse.text, 'English', englishTextRef) : 'English translation not available'}
            </div>
          )}
          {(translation === 'Telugu' || translation === 'Both') && translation === 'Both' && <hr className="border-border my-2" />}
          {(translation === 'Telugu' || translation === 'Both') && (
            <div className="p-3 font-noto-serif-telugu">
              {/* <span className={`font-bold`}>Telugu:</span>{' '} */}
              {teluguText ? renderAnnotatedText(teluguText, 'Telugu', teluguTextRef) : 'Telugu translation not available'}
            </div>
          )}
        </div>
        <div className="mt-2 space-y-1">
          {notes.length > 0 && (
            <div className="space-y-1">
              {notes.map((note) => (
                <div key={note.id} className={`p-2 rounded-md text-sm`}>
                  {note.content}
                </div>
              ))}
            </div>
          )}
          {verseLinks.length > 0 && (
            <div className="space-y-1">
              {verseLinks.map((link) => (
                <div key={link.id} className={`text-sm`}>
                  Linked to:{' '}
                  <button
                    className={isDarkMode ? 'text-white hover:underline' : 'text-black hover:underline'}
                    onClick={() => onNavigate && onNavigate(link.targetRef)}
                  >
                    {link.targetRef}
                  </button>
                </div>
              ))}
            </div>
          )}
          {drawNotes.length > 0 && (
            <div className="space-y-1">
              {drawNotes.map((drawNote) => (
                <img
                  key={drawNote.id}
                  src={drawNote.data}
                  alt="Drawn note"
                  className="w-32 h-32 object-contain rounded-md"
                />
              ))}
            </div>
          )}
        </div>
      </div>
      {error && (
        <Alert variant="destructive" className="mt-1">
          <AlertTitle >Error</AlertTitle>
          <AlertDescription >{error}</AlertDescription>
        </Alert>
      )}
      {isAddingNote && (
        <div className="mt-1 space-y-1">
          <Textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a note..."
            className={`w-full text-sm`}
          />
          <div className="flex gap-2">
            <Button
              onClick={addNote}
              size="sm"
              className="bg-primary"
            >
              Save Note
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddingNote(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
      <Dialog open={isHighlighting} onOpenChange={setIsHighlighting}>
        <DialogContent >
          <DialogHeader>
            <DialogTitle >Highlight Verse</DialogTitle>
            <DialogDescription >
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
            className="mt-4 bg-primary"
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
            window.getSelection()?.removeAllRanges();
          }
        }}
      >
        <DialogContent >
          <DialogHeader>
            <DialogTitle >Annotate Text</DialogTitle>
            <DialogDescription >
              {selectedTextRange
                ? `Annotate selected text in ${verse.book_name} ${verse.chapter}:${verse.verse} for both English and Telugu.`
                : 'Select text in the verse to annotate.'}
            </DialogDescription>
          </DialogHeader>
          {selectedTextRange && (
            <>
              <div className="space-y-2">
                <label className={`text-sm font-medium `}>Highlight Color</label>
                <ChromePicker
                  color={annotationStyle.color}
                  onChange={(color) => setAnnotationStyle({ ...annotationStyle, color:color.hex})}
                  disableAlpha
                />
                <label className={`text-sm font-medium `}>Underline Type</label>
                <Select
                  value={annotationStyle.underlineType || 'solid'}
                  onValueChange={(value) =>
                    setAnnotationStyle({ ...annotationStyle, underlineType: value as 'solid' | 'dotted' | 'dashed' | 'wavy' })
                  }
                >
                  <SelectTrigger className={`bg-card dark:bg-card`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent >
                    <SelectItem value="solid">Solid</SelectItem>
                    <SelectItem value="dotted">Dotted</SelectItem>
                    <SelectItem value="dashed">Dashed</SelectItem>
                    <SelectItem value="wavy">Wavy</SelectItem>
                  </SelectContent>
                </Select>
                <label className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-black'}`}>Font Style</label>
                <div className="flex gap-2">
                  <Button
                    variant={annotationStyle.bold ? 'default' : 'outline'}
                    onClick={() => setAnnotationStyle({ ...annotationStyle, bold: !annotationStyle.bold })}
                    size="sm"
                    className={annotationStyle.bold ? 'bg-primary text-white dark:text-white' : `bg-card dark:bg-card ${isDarkMode ? 'text-white hover:bg-gray-700' : 'text-black hover:bg-gray-200'}`}
                  >
                    Bold
                  </Button>
                  <Button
                    variant={annotationStyle.italic ? 'default' : 'outline'}
                    onClick={() => setAnnotationStyle({ ...annotationStyle, italic: !annotationStyle.italic })}
                    size="sm"
                    className={annotationStyle.italic ? 'bg-primary text-white dark:text-white' : `bg-card dark:bg-card ${isDarkMode ? 'text-white hover:bg-gray-700' : 'text-black hover:bg-gray-200'}`}
                  >
                    Italic
                  </Button>
                </div>
                <label className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-black'}`}>Font Family</label>
                <Select
                  value={annotationStyle.fontFamily || 'Arial'}
                  onValueChange={(value) => setAnnotationStyle({ ...annotationStyle, fontFamily: value })}
                >
                  <SelectTrigger className={`bg-card dark:bg-card ${isDarkMode ? 'text-white' : 'text-black'}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent >
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
                className="mt-4 bg-primary text-white dark:text-white hover:bg-gray-700 dark:hover:bg-gray-700"
              >
                Apply Annotation
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={isLinkingVerse} onOpenChange={setIsLinkingVerse}>
        <DialogContent >
          <DialogHeader>
            <DialogTitle >Link to Another Verse</DialogTitle>
            <DialogDescription >
              Enter a verse reference (e.g., John:3:16) to link from {verse.book_name} {verse.chapter}:{verse.verse}.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={targetVerseRef}
            onChange={(e) => setTargetVerseRef(e.target.value)}
            placeholder="Enter verse (e.g., John:3:16)"
            className={`w-full bg-card dark:bg-card ${isDarkMode ? 'text-white' : 'text-black'}`}
          />
          <Button
            onClick={addVerseLink}
            className="mt-4 bg-primary text-white dark:text-white hover:bg-gray-700 dark:hover:bg-gray-700"
          >
            Save Link
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog open={isDrawing} onOpenChange={setIsDrawing}>
        <DialogContent >
          <DialogHeader>
            <DialogTitle >Draw Note</DialogTitle>
            <DialogDescription >
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
            className="border border-border dark:border-border rounded-md"
          />
          <div className="flex gap-2 mt-4">
            <Button
              onClick={saveDrawing}
              size="sm"
              className="bg-primary text-white dark:text-white hover:bg-gray-700 dark:hover:bg-gray-700"
            >
              Save Drawing
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={`bg-card dark:bg-card ${isDarkMode ? 'text-white hover:bg-gray-700' : 'text-black hover:bg-gray-200'}`}
              onClick={() => setIsDrawing(false)}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!showRemoveHighlightDialog} onOpenChange={() => setShowRemoveHighlightDialog(null)}>
        <AlertDialogContent >
          <AlertDialogHeader>
            <AlertDialogTitle >Remove Highlight</AlertDialogTitle>
            <AlertDialogDescription >
              Are you sure you want to remove this highlight from {verse.book_name} {verse.chapter}:{verse.verse}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={`bg-card dark:bg-card ${isDarkMode ? 'text-white hover:bg-gray-700' : 'text-black hover:bg-gray-200'}`}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeHighlight(showRemoveHighlightDialog as string)}
              className="bg-primary text-white dark:text-white hover:bg-gray-700 dark:hover:bg-gray-700"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!showRemoveNoteDialog} onOpenChange={() => setShowRemoveNoteDialog(null)}>
        <AlertDialogContent >
          <AlertDialogHeader>
            <AlertDialogTitle >Remove Note</AlertDialogTitle>
            <AlertDialogDescription >
              Are you sure you want to remove this note from {verse.book_name} {verse.chapter}:{verse.verse}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={`bg-card dark:bg-card ${isDarkMode ? 'text-white hover:bg-gray-700' : 'text-black hover:bg-gray-200'}`}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeNote(showRemoveNoteDialog as string)}
              className="bg-primary text-white dark:text-white hover:bg-gray-700 dark:hover:bg-gray-700"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!showRemoveDrawNoteDialog} onOpenChange={() => setShowRemoveDrawNoteDialog(null)}>
        <AlertDialogContent >
          <AlertDialogHeader>
            <AlertDialogTitle >Remove Drawing</AlertDialogTitle>
            <AlertDialogDescription >
              Are you sure you want to remove this drawing from {verse.book_name} {verse.chapter}:{verse.verse}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={`bg-card dark:bg-card ${isDarkMode ? 'text-white hover:bg-gray-700' : 'text-black hover:bg-gray-200'}`}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeDrawNote(showRemoveDrawNoteDialog as string)}
              className="bg-primary text-white dark:text-white hover:bg-gray-700 dark:hover:bg-gray-700"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!showRemoveTextAnnotationDialog} onOpenChange={() => setShowRemoveTextAnnotationDialog(null)}>
        <AlertDialogContent >
          <AlertDialogHeader>
            <AlertDialogTitle >Remove Text Annotation</AlertDialogTitle>
            <AlertDialogDescription >
              Are you sure you want to remove this text annotation from {verse.book_name} {verse.chapter}:{verse.verse}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={`bg-card dark:bg-card ${isDarkMode ? 'text-white hover:bg-gray-700' : 'text-black hover:bg-gray-200'}`}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeTextAnnotation(showRemoveTextAnnotationDialog as string)}
              className="bg-primary text-white dark:text-white hover:bg-gray-700 dark:hover:bg-gray-700"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}