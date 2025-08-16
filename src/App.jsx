import { useEffect, useMemo, useState, useRef, useCallback } from "react";

const uid = () =>
  (window.crypto && window.crypto.randomUUID)
    ? window.crypto.randomUUID()
    : String(Date.now()) + Math.random().toString(16).slice(2);

// Theme context
const THEMES = {
  light: "light",
  dark: "dark",
  auto: "auto"
};

// Categories for notes
const CATEGORIES = [
  { id: "personal", name: "Personal", color: "#ff6b6b" },
  { id: "work", name: "Work", color: "#4ecdc4" },
  { id: "ideas", name: "Ideas", color: "#45b7d1" },
  { id: "todos", name: "To-Do", color: "#96ceb4" },
  { id: "important", name: "Important", color: "#feca57" },
];

// Priority levels
const PRIORITIES = {
  low: { name: "Low", color: "#95a5a6" },
  medium: { name: "Medium", color: "#f39c12" },
  high: { name: "High", color: "#e74c3c" }
};

// Sort options
const SORT_OPTIONS = {
  newest: "Newest First",
  oldest: "Oldest First",
  alphabetical: "Alphabetical",
  priority: "Priority",
  category: "Category"
};

export default function App() {
  // Core states
  const [notes, setNotes] = useState(() => {
    try {
      const saved = localStorage.getItem("notes-v2");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");

  // New feature states
  const [selectedCategory, setSelectedCategory] = useState("personal");
  const [selectedPriority, setSelectedPriority] = useState("medium");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState("grid"); // grid, list, compact
  const [theme, setTheme] = useState(() => 
    localStorage.getItem("theme") || "light"
  );
  
  // Advanced features
  const [selectedNotes, setSelectedNotes] = useState(new Set());
  const [showArchived, setShowArchived] = useState(false);
  const [exportFormat, setExportFormat] = useState("json");
  const [showStatistics, setShowStatistics] = useState(false);
  const [reminderDate, setReminderDate] = useState("");
  const [reminderTime, setReminderTime] = useState("");
  const [tags, setTags] = useState("");
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [favoriteNotes, setFavoriteNotes] = useState(new Set());
  const [pinnedNotes, setPinnedNotes] = useState(new Set());
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState("#ffffff");
  const [autoSave, setAutoSave] = useState(true);
  const [wordWrap, setWordWrap] = useState(true);
  const [fontSize, setFontSize] = useState("medium");
  const [showWordCount, setShowWordCount] = useState(true);
  const [backupInterval, setBackupInterval] = useState(30); // minutes
  const [lastBackup, setLastBackup] = useState(null);

  // Refs
  const draftRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-save draft
  useEffect(() => {
    if (autoSave && draft) {
      const timeoutId = setTimeout(() => {
        localStorage.setItem("draft", draft);
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [draft, autoSave]);

  // Load draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem("draft");
    if (savedDraft) {
      setDraft(savedDraft);
    }
  }, []);

  // Theme effect
  useEffect(() => {
    localStorage.setItem("theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Persist notes with backup
  useEffect(() => {
    localStorage.setItem("notes-v2", JSON.stringify(notes));
    
    // Create backup
    if (notes.length > 0) {
      const backup = {
        notes,
        timestamp: Date.now(),
        version: "2.0"
      };
      localStorage.setItem("notes-backup", JSON.stringify(backup));
      setLastBackup(Date.now());
    }
  }, [notes]);

  // Auto backup
  useEffect(() => {
    const interval = setInterval(() => {
      if (notes.length > 0) {
        const backup = {
          notes,
          timestamp: Date.now(),
          version: "2.0"
        };
        localStorage.setItem(`notes-backup-${Date.now()}`, JSON.stringify(backup));
        setLastBackup(Date.now());
      }
    }, backupInterval * 60 * 1000);

    return () => clearInterval(interval);
  }, [notes, backupInterval]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyboard = (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "s":
            e.preventDefault();
            if (editingId) {
              saveEdit();
            } else if (draft.trim()) {
              addNote();
            }
            break;
          case "n":
            e.preventDefault();
            draftRef.current?.focus();
            break;
          case "f":
            e.preventDefault();
            document.querySelector(".search")?.focus();
            break;
          case "a":
            e.preventDefault();
            if (filtered.length > 0) {
              setSelectedNotes(new Set(filtered.map(n => n.id)));
            }
            break;
          case "d":
            e.preventDefault();
            if (selectedNotes.size > 0) {
              bulkDelete();
            }
            break;
          default:
            break;
        }
      }
      if (e.key === "Escape") {
        if (editingId) {
          cancelEdit();
        }
        setSelectedNotes(new Set());
      }
    };

    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, [editingId, draft, selectedNotes]);

  // Statistics calculation
  const statistics = useMemo(() => {
    const total = notes.length;
    const archived = notes.filter(n => n.archived).length;
    const active = total - archived;
    const categories = CATEGORIES.reduce((acc, cat) => {
      acc[cat.id] = notes.filter(n => n.category === cat.id).length;
      return acc;
    }, {});
    const priorities = Object.keys(PRIORITIES).reduce((acc, priority) => {
      acc[priority] = notes.filter(n => n.priority === priority).length;
      return acc;
    }, {});
    const totalWords = notes.reduce((acc, note) => {
      return acc + note.text.split(/\s+/).length;
    }, 0);
    const averageLength = total > 0 ? Math.round(totalWords / total) : 0;
    
    return {
      total,
      active,
      archived,
      categories,
      priorities,
      totalWords,
      averageLength,
      favorites: favoriteNotes.size,
      pinned: pinnedNotes.size
    };
  }, [notes, favoriteNotes, pinnedNotes]);

  // Enhanced filtering and sorting
  const filtered = useMemo(() => {
    let result = showArchived 
      ? notes.filter(n => n.archived) 
      : notes.filter(n => !n.archived);

    // Search filter
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(n => 
        n.text.toLowerCase().includes(q) ||
        n.title?.toLowerCase().includes(q) ||
        n.tags?.some(tag => tag.toLowerCase().includes(q))
      );
    }

    // Category filter
    if (filterCategory !== "all") {
      result = result.filter(n => n.category === filterCategory);
    }

    // Priority filter
    if (filterPriority !== "all") {
      result = result.filter(n => n.priority === filterPriority);
    }

    // Sorting
    result.sort((a, b) => {
      // Pinned notes always come first
      if (pinnedNotes.has(a.id) && !pinnedNotes.has(b.id)) return -1;
      if (!pinnedNotes.has(a.id) && pinnedNotes.has(b.id)) return 1;

      switch (sortBy) {
        case "oldest":
          return a.createdAt - b.createdAt;
        case "alphabetical":
          return (a.title || a.text).localeCompare(b.title || b.text);
        case "priority":
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        case "category":
          return a.category.localeCompare(b.category);
        default: // newest
          return b.createdAt - a.createdAt;
      }
    });

    return result;
  }, [notes, search, filterCategory, filterPriority, sortBy, showArchived, pinnedNotes]);

  // Get all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set();
    notes.forEach(note => {
      note.tags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet);
  }, [notes]);

  // Enhanced add note function
  const addNote = useCallback(() => {
    const text = draft.trim();
    if (!text) return;

    const tagList = tags
      .split(",")
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    const newNote = {
      id: uid(),
      text,
      title: text.split("\n")[0].substring(0, 50),
      category: selectedCategory,
      priority: selectedPriority,
      tags: tagList,
      color: selectedColor,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      archived: false,
      reminder: reminderDate && reminderTime 
        ? new Date(`${reminderDate}T${reminderTime}`).getTime()
        : null
    };

    setNotes(prev => [newNote, ...prev]);
    setDraft("");
    setTags("");
    setReminderDate("");
    setReminderTime("");
    setSelectedColor("#ffffff");
    localStorage.removeItem("draft");
  }, [draft, selectedCategory, selectedPriority, tags, selectedColor, reminderDate, reminderTime]);

  // Enhanced remove note function
  const removeNote = useCallback((id) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    setSelectedNotes(prev => {
      const updated = new Set(prev);
      updated.delete(id);
      return updated;
    });
    setFavoriteNotes(prev => {
      const updated = new Set(prev);
      updated.delete(id);
      return updated;
    });
    setPinnedNotes(prev => {
      const updated = new Set(prev);
      updated.delete(id);
      return updated;
    });
    if (editingId === id) {
      setEditingId(null);
      setEditText("");
    }
  }, [editingId]);

  // Archive note
  const archiveNote = useCallback((id) => {
    setNotes(prev => prev.map(n => 
      n.id === id ? { ...n, archived: !n.archived, updatedAt: Date.now() } : n
    ));
  }, []);

  // Toggle favorite
  const toggleFavorite = useCallback((id) => {
    setFavoriteNotes(prev => {
      const updated = new Set(prev);
      if (updated.has(id)) {
        updated.delete(id);
      } else {
        updated.add(id);
      }
      return updated;
    });
  }, []);

  // Toggle pin
  const togglePin = useCallback((id) => {
    setPinnedNotes(prev => {
      const updated = new Set(prev);
      if (updated.has(id)) {
        updated.delete(id);
      } else {
        updated.add(id);
      }
      return updated;
    });
  }, []);

  // Duplicate note
  const duplicateNote = useCallback((note) => {
    const newNote = {
      ...note,
      id: uid(),
      text: `${note.text} (Copy)`,
      title: `${note.title} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setNotes(prev => [newNote, ...prev]);
  }, []);

  // Bulk operations
  const bulkDelete = useCallback(() => {
    if (window.confirm(`Delete ${selectedNotes.size} selected notes?`)) {
      setNotes(prev => prev.filter(n => !selectedNotes.has(n.id)));
      setSelectedNotes(new Set());
    }
  }, [selectedNotes]);

  const bulkArchive = useCallback(() => {
    setNotes(prev => prev.map(n => 
      selectedNotes.has(n.id) 
        ? { ...n, archived: !n.archived, updatedAt: Date.now() }
        : n
    ));
    setSelectedNotes(new Set());
  }, [selectedNotes]);

  const bulkChangeCategory = useCallback((category) => {
    setNotes(prev => prev.map(n => 
      selectedNotes.has(n.id) 
        ? { ...n, category, updatedAt: Date.now() }
        : n
    ));
    setSelectedNotes(new Set());
  }, [selectedNotes]);

  // Enhanced edit functions
  const startEdit = useCallback((note) => {
    setEditingId(note.id);
    setEditText(note.text);
    setSelectedCategory(note.category);
    setSelectedPriority(note.priority);
    setTags(note.tags?.join(", ") || "");
    setSelectedColor(note.color || "#ffffff");
  }, []);

  const saveEdit = useCallback(() => {
    const text = editText.trim();
    if (!text) return;

    const tagList = tags
      .split(",")
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    setNotes(prev => prev.map(n => 
      n.id === editingId 
        ? { 
            ...n, 
            text,
            title: text.split("\n")[0].substring(0, 50),
            category: selectedCategory,
            priority: selectedPriority,
            tags: tagList,
            color: selectedColor,
            updatedAt: Date.now()
          }
        : n
    ));
    setEditingId(null);
    setEditText("");
    setTags("");
    setSelectedColor("#ffffff");
  }, [editText, editingId, selectedCategory, selectedPriority, tags, selectedColor]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditText("");
    setTags("");
    setSelectedColor("#ffffff");
  }, []);

  // Export functions
  const exportNotes = useCallback(() => {
    const dataToExport = showArchived 
      ? notes.filter(n => n.archived)
      : notes.filter(n => !n.archived);

    let content, filename, mimeType;

    switch (exportFormat) {
      case "txt":
        content = dataToExport.map(note => 
          `Title: ${note.title}\nCategory: ${note.category}\nPriority: ${note.priority}\nCreated: ${new Date(note.createdAt).toLocaleString()}\nTags: ${note.tags?.join(", ") || "None"}\n\n${note.text}\n\n${"=".repeat(50)}\n\n`
        ).join("");
        filename = "notes.txt";
        mimeType = "text/plain";
        break;
      case "csv":
        const csvHeader = "Title,Category,Priority,Created,Updated,Tags,Text\n";
        const csvContent = dataToExport.map(note =>
          `"${note.title}","${note.category}","${note.priority}","${new Date(note.createdAt).toLocaleString()}","${new Date(note.updatedAt).toLocaleString()}","${note.tags?.join("; ") || ""}","${note.text.replace(/"/g, '""')}"`
        ).join("\n");
        content = csvHeader + csvContent;
        filename = "notes.csv";
        mimeType = "text/csv";
        break;
      default: // json
        content = JSON.stringify(dataToExport, null, 2);
        filename = "notes.json";
        mimeType = "application/json";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [notes, exportFormat, showArchived]);

  // Import function
  const importNotes = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        if (Array.isArray(importedData)) {
          const newNotes = importedData.map(note => ({
            ...note,
            id: uid(),
            createdAt: Date.now(),
            updatedAt: Date.now()
          }));
          setNotes(prev => [...newNotes, ...prev]);
        }
      } catch (error) {
        alert("Invalid file format. Please select a valid JSON file.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }, []);

  // Note selection
  const toggleNoteSelection = useCallback((id) => {
    setSelectedNotes(prev => {
      const updated = new Set(prev);
      if (updated.has(id)) {
        updated.delete(id);
      } else {
        updated.add(id);
      }
      return updated;
    });
  }, []);

  // Utility functions
  const fmt = (ts) =>
    new Date(ts).toLocaleString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const getWordCount = (text) => {
    return text.trim().split(/\s+/).length;
  };

  const getCharCount = (text) => {
    return text.length;
  };

  const remaining = 500 - draft.length;
  const disabled = draft.trim().length === 0 || draft.length > 500;
  const isSelectionMode = selectedNotes.size > 0;

  return (
    <div className={`app theme-${theme} font-${fontSize} ${wordWrap ? 'word-wrap' : ''}`}>
      {/* Header */}
      <header className="topbar">
        <div className="topbar-left">
          <h1>📝 React Notes Pro</h1>
          <span className="version">v2.0</span>
        </div>
        
        <div className="topbar-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes, tags, categories..."
            className="search"
          />
        </div>

        <div className="topbar-right">
          <button
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="icon-btn"
            title="Toggle theme"
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>
          
          <button
            onClick={() => setShowStatistics(!showStatistics)}
            className="icon-btn"
            title="Statistics"
          >
            📊
          </button>

          <div className="dropdown">
            <button className="icon-btn">⚙️</button>
            <div className="dropdown-content">
              <div className="setting-group">
                <label>
                  <input
                    type="checkbox"
                    checked={autoSave}
                    onChange={(e) => setAutoSave(e.target.checked)}
                  />
                  Auto-save
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={wordWrap}
                    onChange={(e) => setWordWrap(e.target.checked)}
                  />
                  Word wrap
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={showWordCount}
                    onChange={(e) => setShowWordCount(e.target.checked)}
                  />
                  Show word count
                </label>
              </div>
              
              <div className="setting-group">
                <label>
                  Font size:
                  <select
                    value={fontSize}
                    onChange={(e) => setFontSize(e.target.value)}
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </label>
              </div>

              <div className="setting-group">
                <label>
                  Backup interval (minutes):
                  <input
                    type="number"
                    min="5"
                    max="1440"
                    value={backupInterval}
                    onChange={(e) => setBackupInterval(Number(e.target.value))}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Statistics Panel */}
      {showStatistics && (
        <div className="statistics-panel">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">{statistics.total}</div>
              <div className="stat-label">Total Notes</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{statistics.active}</div>
              <div className="stat-label">Active</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{statistics.archived}</div>
              <div className="stat-label">Archived</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{statistics.totalWords}</div>
              <div className="stat-label">Total Words</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{statistics.averageLength}</div>
              <div className="stat-label">Avg Words/Note</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{statistics.favorites}</div>
              <div className="stat-label">Favorites</div>
            </div>
          </div>

          <div className="stats-categories">
            <h3>By Category</h3>
            {CATEGORIES.map(cat => (
              <div key={cat.id} className="category-stat">
                <span className="category-color" style={{backgroundColor: cat.color}}></span>
                <span>{cat.name}: {statistics.categories[cat.id] || 0}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar-section">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
          >
            <option value="all">All Priorities</option>
            {Object.entries(PRIORITIES).map(([key, priority]) => (
              <option key={key} value={key}>{priority.name}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            {Object.entries(SORT_OPTIONS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        <div className="toolbar-section">
          <div className="view-mode-toggle">
            {["grid", "list", "compact"].map(mode => (
              <button
                key={mode}
                className={`view-btn ${viewMode === mode ? "active" : ""}`}
                onClick={() => setViewMode(mode)}
                title={`${mode} view`}
              >
                {mode === "grid" ? "⊞" : mode === "list" ? "☰" : "≡"}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`toggle-btn ${showArchived ? "active" : ""}`}
          >
            {showArchived ? "📦 Archived" : "📝 Active"}
          </button>
        </div>

        <div className="toolbar-section">
          <input
            type="file"
            ref={fileInputRef}
            onChange={importNotes}
            accept=".json"
            style={{ display: "none" }}
          />
          <button onClick={() => fileInputRef.current?.click()}>
            📁 Import
          </button>
          
          <div className="dropdown">
            <button>📤 Export</button>
            <div className="dropdown-content">
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
              >
                <option value="json">JSON</option>
                <option value="txt">Text</option>
                <option value="csv">CSV</option>
              </select>
              <button onClick={exportNotes}>Download</button>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {isSelectionMode && (
        <div className="bulk-actions">
          <span>{selectedNotes.size} selected</span>
          <button onClick={bulkDelete} className="danger">Delete</button>
          <button onClick={bulkArchive}>
            {showArchived ? "Unarchive" : "Archive"}
          </button>
          <div className="dropdown">
            <button>Change Category</button>
            <div className="dropdown-content">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => bulkChangeCategory(cat.id)}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => setSelectedNotes(new Set())}>Clear</button>
        </div>
      )}

      {/* Composer */}
      <section className="composer">
        <div className="composer-header">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {CATEGORIES.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
          >
            {Object.entries(PRIORITIES).map(([key, priority]) => (
              <option key={key} value={key}>{priority.name}</option>
            ))}
          </select>

          <div className="color-picker">
            <button
              className="color-btn"
              style={{ backgroundColor: selectedColor }}
              onClick={() => setShowColorPicker(!showColorPicker)}
            />
            {showColorPicker && (
              <div className="color-palette">
                {["#ffffff", "#ffeb3b", "#4caf50", "#2196f3", "#ff5722", "#9c27b0"].map(color => (
                  <button
                    key={color}
                    className="color-option"
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      setSelectedColor(color);
                      setShowColorPicker(false);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <textarea
          ref={draftRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a note (max 500 chars)…"
          maxLength={600}
          style={{ backgroundColor: selectedColor }}
        />

        <div className="composer-meta">
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Tags (comma separated)"
            className="tags-input"
          />
          
          <div className="reminder-section">
            <input
              type="date"
              value={reminderDate}
              onChange={(e) => setReminderDate(e.target.value)}
              className="reminder-date"
            />
            <input
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              className="reminder-time"
            />
          </div>
        </div>

        <div className="composer-actions">
          <div className="composer-stats">
            <span className={`counter ${remaining < 0 ? "bad" : ""}`}>
              {remaining} chars left
            </span>
            {showWordCount && (
              <span className="word-count">
                {getWordCount(draft)} words
              </span>
            )}
          </div>
          <button onClick={addNote} disabled={disabled}>
            Add Note
          </button>
        </div>

        {/* Tag suggestions */}
        {showTagSuggestions && allTags.length > 0 && (
          <div className="tag-suggestions">
            {allTags.map(tag => (
              <button
                key={tag}
                className="tag-suggestion"
                onClick={() => {
                  const currentTags = tags ? tags + ", " : "";
                  setTags(currentTags + tag);
                }}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Notes Grid */}
      <main className={`notes-container ${viewMode}`}>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <h2>
              {search 
                ? "No notes match your search" 
                : showArchived 
                  ? "No archived notes" 
                  : "No notes yet"}
            </h2>
            <p>
              {search 
                ? "Try adjusting your search terms or filters" 
                : showArchived 
                  ? "Archive some notes to see them here"
                  : "Add your first note to get started!"}
            </p>
          </div>
        ) : (
          filtered.map((note) => (
            <article
              key={note.id}
              className={`note-card ${selectedNotes.has(note.id) ? "selected" : ""} ${pinnedNotes.has(note.id) ? "pinned" : ""}`}
              style={{ backgroundColor: note.color || "#ffffff" }}
              onClick={(e) => {
                if (e.ctrlKey || e.metaKey) {
                  toggleNoteSelection(note.id);
                }
              }}
            >
              <div className="note-header">
                <div className="note-meta">
                  <span className="note-date">{fmt(note.createdAt)}</span>
                  {note.updatedAt !== note.createdAt && (
                    <span className="note-updated">
                      (edited {fmt(note.updatedAt)})
                    </span>
                  )}
                </div>
                
                <div className="note-indicators">
                  {pinnedNotes.has(note.id) && <span className="indicator pin">📌</span>}
                  {favoriteNotes.has(note.id) && <span className="indicator favorite">⭐</span>}
                  {note.reminder && <span className="indicator reminder">⏰</span>}
                </div>

                <div className="note-actions">
                  {editingId === note.id ? (
                    <>
                      <button onClick={saveEdit} className="action-btn save">
                        💾
                      </button>
                      <button onClick={cancelEdit} className="action-btn cancel">
                        ❌
                      </button>
                    </>
                  ) : (
                    <>
                      <input
                        type="checkbox"
                        checked={selectedNotes.has(note.id)}
                        onChange={() => toggleNoteSelection(note.id)}
                        className="note-checkbox"
                      />
                      <button
                        onClick={() => togglePin(note.id)}
                        className="action-btn pin"
                        title="Pin note"
                      >
                        📌
                      </button>
                      <button
                        onClick={() => toggleFavorite(note.id)}
                        className={`action-btn favorite ${favoriteNotes.has(note.id) ? "active" : ""}`}
                        title="Favorite"
                      >
                        ⭐
                      </button>
                      <div className="dropdown">
                        <button className="action-btn more">⋯</button>
                        <div className="dropdown-content">
                          <button onClick={() => startEdit(note)}>✏️ Edit</button>
                          <button onClick={() => duplicateNote(note)}>📄 Duplicate</button>
                          <button onClick={() => archiveNote(note.id)}>
                            {note.archived ? "📤 Unarchive" : "📦 Archive"}
                          </button>
                          <button 
                            onClick={() => removeNote(note.id)}
                            className="danger"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="note-category-priority">
                <span 
                  className="category-badge"
                  style={{ 
                    backgroundColor: CATEGORIES.find(c => c.id === note.category)?.color 
                  }}
                >
                  {CATEGORIES.find(c => c.id === note.category)?.name}
                </span>
                <span 
                  className={`priority-badge priority-${note.priority}`}
                  style={{ 
                    color: PRIORITIES[note.priority]?.color 
                  }}
                >
                  {PRIORITIES[note.priority]?.name}
                </span>
              </div>

              {editingId === note.id ? (
                <div className="edit-section">
                  <textarea
                    className="edit-textarea"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    autoFocus
                    style={{ backgroundColor: selectedColor }}
                  />
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="Tags (comma separated)"
                    className="edit-tags"
                  />
                </div>
              ) : (
                <div className="note-content">
                  <h3 className="note-title">{note.title}</h3>
                  <p className="note-text">{note.text}</p>
                  
                  {note.tags && note.tags.length > 0 && (
                    <div className="note-tags">
                      {note.tags.map((tag, index) => (
                        <span key={index} className="tag">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {showWordCount && (
                    <div className="note-stats">
                      <span>{getWordCount(note.text)} words</span>
                      <span>{getCharCount(note.text)} chars</span>
                    </div>
                  )}

                  {note.reminder && (
                    <div className="note-reminder">
                      🔔 {fmt(note.reminder)}
                    </div>
                  )}
                </div>
              )}
            </article>
          ))
        )}
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-section">
          <small>Saved locally — no account needed</small>
          {lastBackup && (
            <small>Last backup: {fmt(lastBackup)}</small>
          )}
        </div>
        
        <div className="footer-section">
          <small>
            {filtered.length} of {notes.filter(n => !n.archived).length} notes
          </small>
        </div>

        <div className="footer-section">
          <small>
            Shortcuts: Ctrl+N (new), Ctrl+S (save), Ctrl+F (search), Ctrl+A (select all)
          </small>
        </div>
      </footer>
    </div>
  );
}

