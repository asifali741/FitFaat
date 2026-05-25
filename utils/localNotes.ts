import AsyncStorage from '@react-native-async-storage/async-storage';

export const FITFAAT_NOTES_STORAGE_KEY = 'fitfaat_notes';

export type FitFaatNote = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  pinned?: boolean;
};

export type FitFaatNoteInput = {
  id?: string;
  title: string;
  body: string;
  pinned?: boolean;
};

const createNoteId = () =>
  `note-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const isValidDateString = (value: unknown) =>
  typeof value === 'string' && !Number.isNaN(new Date(value).getTime());

const normalizeNote = (value: any): FitFaatNote | null => {
  if (!value || typeof value !== 'object') return null;

  const id = typeof value.id === 'string' && value.id.trim() ? value.id : createNoteId();
  const body = typeof value.body === 'string' ? value.body : '';
  const rawTitle = typeof value.title === 'string' ? value.title : '';
  const title = deriveNoteTitle(rawTitle, body);
  const now = new Date().toISOString();

  return {
    id,
    title,
    body,
    createdAt: isValidDateString(value.createdAt) ? value.createdAt : now,
    updatedAt: isValidDateString(value.updatedAt) ? value.updatedAt : now,
    pinned: Boolean(value.pinned),
  };
};

export const sortFitFaatNotes = (notes: FitFaatNote[]) =>
  [...notes].sort((left, right) => {
    if (Boolean(left.pinned) !== Boolean(right.pinned)) {
      return left.pinned ? -1 : 1;
    }

    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });

export const deriveNoteTitle = (title: string, body: string) => {
  const cleanTitle = title.trim().replace(/\s+/g, ' ');
  if (cleanTitle) return cleanTitle.slice(0, 80);

  const firstBodyLine = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  return firstBodyLine ? firstBodyLine.replace(/\s+/g, ' ').slice(0, 80) : 'Untitled Note';
};

export const loadFitFaatNotes = async (): Promise<FitFaatNote[]> => {
  const rawNotes = await AsyncStorage.getItem(FITFAAT_NOTES_STORAGE_KEY);
  if (!rawNotes) return [];

  try {
    const parsed = JSON.parse(rawNotes);
    if (!Array.isArray(parsed)) return [];

    return sortFitFaatNotes(parsed.map(normalizeNote).filter(Boolean) as FitFaatNote[]);
  } catch (error) {
    console.log('[LocalNotes] Unable to parse notes:', error);
    return [];
  }
};

export const saveFitFaatNotes = async (notes: FitFaatNote[]) => {
  const normalizedNotes = notes.map(normalizeNote).filter(Boolean) as FitFaatNote[];
  await AsyncStorage.setItem(
    FITFAAT_NOTES_STORAGE_KEY,
    JSON.stringify(sortFitFaatNotes(normalizedNotes))
  );
};

export const upsertFitFaatNote = async (input: FitFaatNoteInput) => {
  const notes = await loadFitFaatNotes();
  const now = new Date().toISOString();
  const existingNote = input.id ? notes.find((note) => note.id === input.id) : null;
  const nextNote: FitFaatNote = {
    id: existingNote?.id || input.id || createNoteId(),
    title: deriveNoteTitle(input.title, input.body),
    body: input.body,
    createdAt: existingNote?.createdAt || now,
    updatedAt: now,
    pinned: Boolean(input.pinned),
  };
  const nextNotes = existingNote
    ? notes.map((note) => (note.id === nextNote.id ? nextNote : note))
    : [nextNote, ...notes];

  await saveFitFaatNotes(nextNotes);
  return nextNote;
};

export const deleteFitFaatNote = async (noteId: string) => {
  const notes = await loadFitFaatNotes();
  await saveFitFaatNotes(notes.filter((note) => note.id !== noteId));
};
