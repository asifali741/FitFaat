import AppHeader from "@/components/AppHeader";
import { useTheme } from "@/contexts/ThemeContext";
import { localSyncEvents } from "@/utils/localSyncEvents";
import {
  deleteFitFaatNote,
  FITFAAT_NOTES_STORAGE_KEY,
  type FitFaatNote,
  loadFitFaatNotes,
  upsertFitFaatNote,
} from "@/utils/localNotes";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const formatNoteDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getNotePreview = (note: FitFaatNote) => {
  const cleanBody = note.body.trim().replace(/\s+/g, " ");
  if (cleanBody) return cleanBody;
  return "No note body yet";
};

export default function NotesScreen() {
  const { colors, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () => getStyles(colors, insets.bottom, isDarkMode),
    [colors, insets.bottom, isDarkMode]
  );
  const [notes, setNotes] = useState<FitFaatNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<FitFaatNote | null>(null);
  const [titleInput, setTitleInput] = useState("");
  const [bodyInput, setBodyInput] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const loadNotes = useCallback(async () => {
    try {
      setIsLoading(true);
      const storedNotes = await loadFitFaatNotes();
      setNotes(storedNotes);
    } catch (error) {
      console.log("[Notes] Unable to load notes:", error);
      Alert.alert("Notes Error", "Could not load your notes right now.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotes();
    }, [loadNotes])
  );

  useEffect(() => {
    const unsubscribe = localSyncEvents.subscribe((event) => {
      if (event.restoredKeys.includes(FITFAAT_NOTES_STORAGE_KEY)) {
        loadNotes();
      }
    });

    return unsubscribe;
  }, [loadNotes]);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSubscription = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSubscription = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!editorVisible) {
      setKeyboardVisible(false);
    }
  }, [editorVisible]);

  const filteredNotes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return notes;

    return notes.filter((note) => {
      const haystack = `${note.title} ${note.body}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [notes, searchQuery]);

  const pinnedCount = useMemo(
    () => notes.filter((note) => note.pinned).length,
    [notes]
  );

  const hasDraftChanges = useMemo(() => {
    if (!editorVisible) return false;

    if (!editingNote) {
      return Boolean(titleInput.trim() || bodyInput.trim() || isPinned);
    }

    return (
      titleInput !== editingNote.title ||
      bodyInput !== editingNote.body ||
      isPinned !== Boolean(editingNote.pinned)
    );
  }, [bodyInput, editingNote, editorVisible, isPinned, titleInput]);

  const openNewNote = () => {
    setEditingNote(null);
    setTitleInput("");
    setBodyInput("");
    setIsPinned(false);
    setEditorVisible(true);
  };

  const openExistingNote = (note: FitFaatNote) => {
    setEditingNote(note);
    setTitleInput(note.title);
    setBodyInput(note.body);
    setIsPinned(Boolean(note.pinned));
    setEditorVisible(true);
  };

  const closeEditor = (force = false) => {
    if (!force && hasDraftChanges) {
      Alert.alert(
        "Discard Changes?",
        "Your note has unsaved changes.",
        [
          { text: "Keep Editing", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => closeEditor(true),
          },
        ]
      );
      return;
    }

    setEditorVisible(false);
    setEditingNote(null);
    setTitleInput("");
    setBodyInput("");
    setIsPinned(false);
    setIsSaving(false);
  };

  const saveNote = async () => {
    if (!titleInput.trim() && !bodyInput.trim()) {
      Alert.alert("Empty Note", "Write a title or note before saving.");
      return;
    }

    try {
      setIsSaving(true);
      await upsertFitFaatNote({
        id: editingNote?.id,
        title: titleInput,
        body: bodyInput,
        pinned: isPinned,
      });
      await loadNotes();
      closeEditor(true);
    } catch (error) {
      console.log("[Notes] Unable to save note:", error);
      Alert.alert("Save Failed", "Could not save this note. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDeleteNote = (note: FitFaatNote) => {
    Alert.alert(
      "Delete Note?",
      "This note will be removed from this device and your next sync export.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteFitFaatNote(note.id);
              await loadNotes();
              if (editingNote?.id === note.id) {
                closeEditor(true);
              }
            } catch (error) {
              console.log("[Notes] Unable to delete note:", error);
              Alert.alert("Delete Failed", "Could not delete this note.");
            }
          },
        },
      ]
    );
  };

  const togglePinnedNote = async (note: FitFaatNote) => {
    try {
      await upsertFitFaatNote({
        id: note.id,
        title: note.title,
        body: note.body,
        pinned: !note.pinned,
      });
      await loadNotes();
    } catch (error) {
      console.log("[Notes] Unable to update pin state:", error);
    }
  };

  const renderEmptyState = () => {
    const isSearching = Boolean(searchQuery.trim());

    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIcon}>
          <Ionicons
            name={isSearching ? "search-outline" : "document-text-outline"}
            size={Math.min(hp(5.8), wp(12))}
            color={colors.primary}
          />
        </View>
        <Text style={styles.emptyTitle}>
          {isSearching ? "No matching notes" : "No notes yet"}
        </Text>
        <Text style={styles.emptySubtitle}>
          {isSearching
            ? "Try a different word or clear the search."
            : "Create quick health reminders, symptoms, questions for doctors, or daily thoughts."}
        </Text>
        {!isSearching && (
          <TouchableOpacity style={styles.emptyButton} onPress={openNewNote}>
            <Ionicons name="add" size={Math.min(hp(2.6), wp(5.8))} color="#FFFFFF" />
            <Text style={styles.emptyButtonText}>Create Note</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={colors.screenColor}
      />
      <AppHeader
        title="Notes"
        showStepIndicator={false}
        showMenuButton={false}
        showBackButton
      />

      <View style={styles.content}>
        <View style={styles.toolbar}>
          <View style={styles.searchBox}>
            <Ionicons
              name="search-outline"
              size={Math.min(hp(2.5), wp(5.4))}
              color={colors.textSecondary}
            />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search notes"
              placeholderTextColor={colors.textSecondary}
              selectionColor={colors.primary}
            />
            {Boolean(searchQuery) && (
              <TouchableOpacity
                style={styles.clearSearchButton}
                onPress={() => setSearchQuery("")}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
                <Ionicons
                  name="close-circle"
                  size={Math.min(hp(2.5), wp(5.4))}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={styles.addButton}
            onPress={openNewNote}
            accessibilityRole="button"
            accessibilityLabel="Create note"
          >
            <Ionicons name="add" size={Math.min(hp(2.8), wp(6))} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>
            {notes.length} {notes.length === 1 ? "note" : "notes"}
          </Text>
          {pinnedCount > 0 && (
            <View style={styles.pinSummary}>
              <Ionicons name="pin" size={Math.min(hp(1.7), wp(3.8))} color={colors.primary} />
              <Text style={styles.pinSummaryText}>
                {pinnedCount} pinned
              </Text>
            </View>
          )}
        </View>

        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.notesList}
            keyboardShouldPersistTaps="handled"
          >
            {filteredNotes.length === 0
              ? renderEmptyState()
              : filteredNotes.map((note) => (
                  <TouchableOpacity
                    key={note.id}
                    style={styles.noteCard}
                    activeOpacity={0.82}
                    onPress={() => openExistingNote(note)}
                  >
                    <View style={styles.noteHeader}>
                      <View style={styles.noteTitleWrap}>
                        {note.pinned && (
                          <Ionicons
                            name="pin"
                            size={Math.min(hp(1.9), wp(4.2))}
                            color={colors.primary}
                          />
                        )}
                        <Text style={styles.noteTitle} numberOfLines={1}>
                          {note.title}
                        </Text>
                      </View>
                      <View style={styles.noteActions}>
                        <TouchableOpacity
                          style={styles.iconAction}
                          onPress={(event) => {
                            event.stopPropagation();
                            togglePinnedNote(note);
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={note.pinned ? "Unpin note" : "Pin note"}
                        >
                          <Ionicons
                            name={note.pinned ? "pin" : "pin-outline"}
                            size={Math.min(hp(2.3), wp(5))}
                            color={note.pinned ? colors.primary : colors.textSecondary}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.iconAction}
                          onPress={(event) => {
                            event.stopPropagation();
                            confirmDeleteNote(note);
                          }}
                          accessibilityRole="button"
                          accessibilityLabel="Delete note"
                        >
                          <Ionicons
                            name="trash-outline"
                            size={Math.min(hp(2.3), wp(5))}
                            color={colors.error}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Text style={styles.notePreview} numberOfLines={3}>
                      {getNotePreview(note)}
                    </Text>
                    <View style={styles.noteMetaRow}>
                      <Ionicons
                        name="time-outline"
                        size={Math.min(hp(1.8), wp(4))}
                        color={colors.textSecondary}
                      />
                      <Text style={styles.noteMetaText}>
                        Updated {formatNoteDate(note.updatedAt)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
          </ScrollView>
        )}
      </View>

      <Modal
        visible={editorVisible}
        transparent
        animationType="slide"
        onRequestClose={() => closeEditor()}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          <View style={[styles.editorPanel, keyboardVisible && styles.editorPanelKeyboard]}>
            <View style={styles.editorHeader}>
              <View>
                <Text style={styles.editorTitle}>
                  {editingNote ? "Edit Note" : "New Note"}
                </Text>
                <Text style={styles.editorSubtitle}>
                  Saved locally and included in sync export
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => closeEditor()}
                accessibilityRole="button"
                accessibilityLabel="Close note editor"
              >
                <Ionicons name="close" size={Math.min(hp(3), wp(6.4))} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.editorScroll}
              contentContainerStyle={[
                styles.editorScrollContent,
                keyboardVisible && styles.editorScrollContentKeyboard,
              ]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
            >
              <TextInput
                style={styles.titleInput}
                value={titleInput}
                onChangeText={setTitleInput}
                placeholder="Note title"
                placeholderTextColor={colors.textSecondary}
                selectionColor={colors.primary}
                maxLength={80}
                returnKeyType="next"
              />

              <TextInput
                style={styles.bodyInput}
                value={bodyInput}
                onChangeText={setBodyInput}
                placeholder="Write your note..."
                placeholderTextColor={colors.textSecondary}
                selectionColor={colors.primary}
                multiline
                textAlignVertical="top"
                scrollEnabled
              />

              <TouchableOpacity
                style={styles.pinToggle}
                onPress={() => setIsPinned((value) => !value)}
                accessibilityRole="button"
                accessibilityLabel={isPinned ? "Unpin this note" : "Pin this note"}
              >
                <View style={[styles.pinToggleIcon, isPinned && styles.pinToggleIconActive]}>
                  <Ionicons
                    name={isPinned ? "pin" : "pin-outline"}
                    size={Math.min(hp(2.4), wp(5.2))}
                    color={isPinned ? "#FFFFFF" : colors.primary}
                  />
                </View>
                <View style={styles.pinToggleTextWrap}>
                  <Text style={styles.pinToggleTitle}>
                    {isPinned ? "Pinned note" : "Pin note"}
                  </Text>
                  <Text style={styles.pinToggleSubtitle}>
                    Pinned notes stay at the top.
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={styles.editorActions}>
                {editingNote && (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => confirmDeleteNote(editingNote)}
                    disabled={isSaving}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={Math.min(hp(2.4), wp(5.2))}
                      color={colors.error}
                    />
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.saveButton, isSaving && styles.disabledButton]}
                  onPress={saveNote}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons
                        name="checkmark"
                        size={Math.min(hp(2.5), wp(5.4))}
                        color="#FFFFFF"
                      />
                      <Text style={styles.saveButtonText}>Save Note</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (colors: any, bottomInset: number, isDarkMode: boolean) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.screenColor,
  },
  content: {
    flex: 1,
    backgroundColor: colors.screenColor,
    paddingHorizontal: wp(5),
    paddingTop: hp(2),
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(3),
  },
  searchBox: {
    flex: 1,
    minHeight: hp(6.4),
    borderRadius: wp(3.2),
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.cardBackground,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: wp(4),
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.95), wp(4.2)),
    fontWeight: "600",
    paddingVertical: 0,
    marginLeft: wp(2.4),
    includeFontPadding: false,
  },
  clearSearchButton: {
    width: hp(3.4),
    height: hp(3.4),
    alignItems: "center",
    justifyContent: "center",
  },
  addButton: {
    width: hp(6.4),
    height: hp(6.4),
    borderRadius: wp(3.2),
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.shadowMedium,
    shadowOpacity: isDarkMode ? 0.2 : 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  summaryRow: {
    minHeight: hp(4.8),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: hp(1),
  },
  summaryText: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.75), wp(3.9)),
    fontWeight: "700",
  },
  pinSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(1.2),
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.75),
    borderRadius: wp(8),
    backgroundColor: colors.primarySoft,
  },
  pinSummaryText: {
    color: colors.primary,
    fontSize: Math.min(hp(1.55), wp(3.5)),
    fontWeight: "800",
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  notesList: {
    paddingTop: hp(0.8),
    paddingBottom: Math.max(bottomInset, hp(2)) + hp(12),
  },
  noteCard: {
    borderRadius: wp(4),
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.cardBackground,
    padding: wp(4),
    marginBottom: hp(1.4),
    shadowColor: "#000000",
    shadowOpacity: isDarkMode ? 0.18 : 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  noteHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: wp(2.5),
  },
  noteTitleWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: wp(1.6),
  },
  noteTitle: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: Math.min(hp(2.1), wp(4.6)),
    fontWeight: "900",
    includeFontPadding: false,
  },
  noteActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(1),
  },
  iconAction: {
    width: hp(3.8),
    height: hp(3.8),
    alignItems: "center",
    justifyContent: "center",
    borderRadius: hp(1.9),
    backgroundColor: colors.primarySoft,
  },
  notePreview: {
    marginTop: hp(1.1),
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.8), wp(3.9)),
    lineHeight: Math.min(hp(2.6), wp(5.5)),
    fontWeight: "600",
  },
  noteMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(1.2),
    marginTop: hp(1.2),
  },
  noteMetaText: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.45), wp(3.3)),
    fontWeight: "700",
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: wp(4),
    paddingTop: hp(10),
  },
  emptyIcon: {
    width: hp(10),
    height: hp(10),
    borderRadius: hp(5),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
    marginBottom: hp(2),
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(2.6), wp(5.8)),
    fontWeight: "900",
    textAlign: "center",
  },
  emptySubtitle: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.85), wp(4)),
    lineHeight: Math.min(hp(2.65), wp(5.6)),
    textAlign: "center",
    fontWeight: "600",
    marginTop: hp(0.8),
  },
  emptyButton: {
    minHeight: hp(5.8),
    marginTop: hp(2.4),
    paddingHorizontal: wp(6),
    borderRadius: wp(3),
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: wp(1.8),
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: Math.min(hp(1.9), wp(4.1)),
    fontWeight: "900",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.58)",
  },
  editorPanel: {
    maxHeight: hp(86),
    borderTopLeftRadius: wp(7),
    borderTopRightRadius: wp(7),
    backgroundColor: colors.cardBackground,
    paddingHorizontal: wp(5),
    paddingTop: hp(2.5),
    paddingBottom: Math.max(bottomInset, hp(1.6)) + hp(1),
  },
  editorPanelKeyboard: {
    maxHeight: Platform.OS === "android" ? hp(82) : hp(86),
    paddingBottom: Math.max(bottomInset, hp(1.2)) + hp(1),
  },
  editorHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: wp(3),
    marginBottom: hp(1.8),
  },
  editorTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(2.8), wp(6)),
    fontWeight: "900",
    includeFontPadding: false,
  },
  editorSubtitle: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.55), wp(3.5)),
    fontWeight: "700",
    marginTop: hp(0.5),
  },
  closeButton: {
    width: hp(4.6),
    height: hp(4.6),
    alignItems: "center",
    justifyContent: "center",
  },
  editorScroll: {
    flexGrow: 0,
  },
  editorScrollContent: {
    paddingBottom: 0,
  },
  editorScrollContentKeyboard: {
    paddingBottom: Math.max(bottomInset, hp(2)) + hp(1),
  },
  titleInput: {
    minHeight: hp(6.2),
    borderRadius: wp(3.2),
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.screenColor,
    paddingHorizontal: wp(4),
    color: colors.textPrimary,
    fontSize: Math.min(hp(2), wp(4.4)),
    fontWeight: "800",
    marginBottom: hp(1.2),
  },
  bodyInput: {
    minHeight: hp(24),
    maxHeight: hp(36),
    borderRadius: wp(3.2),
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.screenColor,
    paddingHorizontal: wp(4),
    paddingTop: hp(1.6),
    paddingBottom: hp(1.6),
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.9), wp(4.1)),
    lineHeight: Math.min(hp(2.7), wp(5.7)),
    fontWeight: "600",
  },
  pinToggle: {
    minHeight: hp(7.2),
    borderRadius: wp(3.2),
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.screenColor,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: wp(3.4),
    marginTop: hp(1.2),
    gap: wp(3),
  },
  pinToggleIcon: {
    width: hp(4.6),
    height: hp(4.6),
    borderRadius: hp(2.3),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },
  pinToggleIconActive: {
    backgroundColor: colors.primary,
  },
  pinToggleTextWrap: {
    flex: 1,
  },
  pinToggleTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.85), wp(4)),
    fontWeight: "900",
  },
  pinToggleSubtitle: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.45), wp(3.3)),
    fontWeight: "600",
    marginTop: hp(0.2),
  },
  editorActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(3),
    marginTop: hp(1.8),
  },
  deleteButton: {
    minHeight: hp(5.8),
    minWidth: wp(27),
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: colors.error + "50",
    backgroundColor: colors.screenColor,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: wp(1.5),
    paddingHorizontal: wp(3),
  },
  deleteButtonText: {
    color: colors.error,
    fontSize: Math.min(hp(1.75), wp(3.8)),
    fontWeight: "900",
  },
  saveButton: {
    flex: 1,
    minHeight: hp(5.8),
    borderRadius: wp(3),
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: wp(1.8),
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: Math.min(hp(1.9), wp(4.1)),
    fontWeight: "900",
  },
  disabledButton: {
    opacity: 0.7,
  },
});
