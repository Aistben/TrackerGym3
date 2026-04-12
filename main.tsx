import { useEffect, useMemo, useRef, useState } from 'react';

interface Exercise {
  id: string;
  name: string;
  type: 'основа' | 'подсобка';
  intensity: 'тяжёлые' | 'средние' | 'лёгкие';
}

interface Day {
  id: string;
  day: string;
  name: string;
  fullDay: string;
  exercises: Exercise[];
}

interface HistoryEntry {
  id: string;
  exId: string;
  dayId: string;
  exName: string;
  weight: number;
  sets: number;
  reps: number;
  comment: string;
  date: string;
}

type Page = 'workout' | 'settings';
type ThemeKey = 'cyan' | 'violet' | 'emerald' | 'sunset';

const uid = () => Math.random().toString(36).slice(2, 9);

const THEMES: {
  key: ThemeKey;
  name: string;
  icon: string;
  vars: Record<string, string>;
}[] = [
  {
    key: 'cyan',
    name: 'Неон',
    icon: '🔹',
    vars: {
      '--bg': '#080810',
      '--bg-soft': '#0a0a14',
      '--panel': '#0f0f28',
      '--panel-2': '#131338',
      '--line': '#1c1c48',
      '--line-strong': '#252550',
      '--text': '#e0e0e0',
      '--muted': '#7f82a8',
      '--muted-2': '#4d5075',
      '--accent': '#00d4ff',
      '--accent-2': '#0095b8',
      '--danger': '#ff4444',
      '--warning': '#ffaa00',
      '--success': '#00ff88',
      '--shadow': 'rgba(0, 212, 255, 0.22)',
    },
  },
  {
    key: 'violet',
    name: 'Фиолет',
    icon: '🟣',
    vars: {
      '--bg': '#0c0713',
      '--bg-soft': '#120d1d',
      '--panel': '#171029',
      '--panel-2': '#20163a',
      '--line': '#342556',
      '--line-strong': '#44326a',
      '--text': '#efe7ff',
      '--muted': '#a698c4',
      '--muted-2': '#695d86',
      '--accent': '#b388ff',
      '--accent-2': '#7c4dff',
      '--danger': '#ff5d8f',
      '--warning': '#ffca63',
      '--success': '#6ef7c8',
      '--shadow': 'rgba(179, 136, 255, 0.22)',
    },
  },
  {
    key: 'emerald',
    name: 'Изумруд',
    icon: '🟢',
    vars: {
      '--bg': '#07100c',
      '--bg-soft': '#0b1711',
      '--panel': '#0e2018',
      '--panel-2': '#123025',
      '--line': '#214637',
      '--line-strong': '#2b5d49',
      '--text': '#e7fff5',
      '--muted': '#8db8a5',
      '--muted-2': '#567565',
      '--accent': '#35f0b5',
      '--accent-2': '#16b87f',
      '--danger': '#ff6b6b',
      '--warning': '#ffd166',
      '--success': '#7dffb3',
      '--shadow': 'rgba(53, 240, 181, 0.22)',
    },
  },
  {
    key: 'sunset',
    name: 'Закат',
    icon: '🟠',
    vars: {
      '--bg': '#140a0a',
      '--bg-soft': '#1b0e10',
      '--panel': '#281214',
      '--panel-2': '#34181b',
      '--line': '#553035',
      '--line-strong': '#6e4047',
      '--text': '#fff1ec',
      '--muted': '#c49c92',
      '--muted-2': '#8d645d',
      '--accent': '#ff8a5b',
      '--accent-2': '#ff5e57',
      '--danger': '#ff4d6d',
      '--warning': '#ffd166',
      '--success': '#80ed99',
      '--shadow': 'rgba(255, 138, 91, 0.22)',
    },
  },
];

const createDefaults = (): Day[] => [
  {
    id: 'mon',
    day: 'ПН',
    name: 'Брусья',
    fullDay: 'Понедельник',
    exercises: [
      { id: uid(), name: 'Брусья', type: 'основа', intensity: 'тяжёлые' },
      { id: uid(), name: 'Подтягивания', type: 'подсобка', intensity: 'средние' },
      { id: uid(), name: 'Жим гантелей', type: 'подсобка', intensity: 'лёгкие' },
    ],
  },
  {
    id: 'wed',
    day: 'СР',
    name: 'Тяга',
    fullDay: 'Среда',
    exercises: [
      { id: uid(), name: 'Подтягивания', type: 'основа', intensity: 'тяжёлые' },
      { id: uid(), name: 'Жим лёжа', type: 'подсобка', intensity: 'средние' },
      { id: uid(), name: 'Тяга штанги', type: 'подсобка', intensity: 'лёгкие' },
    ],
  },
  {
    id: 'fri',
    day: 'ПТ',
    name: 'Ноги',
    fullDay: 'Пятница',
    exercises: [
      { id: uid(), name: 'Приседания', type: 'основа', intensity: 'тяжёлые' },
      { id: uid(), name: 'Румынская тяга', type: 'подсобка', intensity: 'средние' },
      { id: uid(), name: 'Жим лёжа', type: 'подсобка', intensity: 'лёгкие' },
    ],
  },
];

export default function App() {
  const [days, setDays] = useState<Day[]>(() => {
    try {
      const saved = localStorage.getItem('wt_days');
      return saved ? JSON.parse(saved) : createDefaults();
    } catch {
      return createDefaults();
    }
  });

  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try {
      const saved = localStorage.getItem('wt_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [theme, setTheme] = useState<ThemeKey>(() => {
    const saved = localStorage.getItem('wt_theme') as ThemeKey | null;
    return saved || 'cyan';
  });

  const [activeDay, setActiveDay] = useState(0);
  const [page, setPage] = useState<Page>('workout');
  const [inputs, setInputs] = useState<Record<string, { weight: string; sets: string; reps: string }>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [showCommentFor, setShowCommentFor] = useState<Record<string, boolean>>({});
  const [showHistoryFor, setShowHistoryFor] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState('');
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [draggedExerciseId, setDraggedExerciseId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const [modal, setModal] = useState<{ type: 'edit' | 'add'; exercise?: Exercise } | null>(null);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'основа' | 'подсобка'>('подсобка');
  const [formIntensity, setFormIntensity] = useState<'тяжёлые' | 'средние' | 'лёгкие'>('средние');

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('wt_days', JSON.stringify(days));
  }, [days]);

  useEffect(() => {
    localStorage.setItem('wt_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('wt_theme', theme);
    const currentTheme = THEMES.find((item) => item.key === theme) || THEMES[0];
    Object.entries(currentTheme.vars).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });
  }, [theme]);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2400);
  };

  const day = days[activeDay];

  const getInput = (id: string) => inputs[id] || { weight: '0', sets: '5', reps: '5' };

  const updateInput = (id: string, field: string, val: string) => {
    setInputs((prev) => ({ ...prev, [id]: { ...getInput(id), [field]: val } }));
  };

  const getExHistory = (exId: string) => history.filter((h) => h.exId === exId);

  const saveExercise = (ex: Exercise) => {
    const inp = getInput(ex.id);
    const entry: HistoryEntry = {
      id: uid(),
      exId: ex.id,
      dayId: day.id,
      exName: ex.name,
      weight: parseFloat(inp.weight) || 0,
      sets: parseInt(inp.sets) || 0,
      reps: parseInt(inp.reps) || 0,
      comment: comments[ex.id] || '',
      date: new Date().toLocaleDateString('ru-RU'),
    };
    setHistory((prev) => [entry, ...prev]);
    notify('Сохранено');
  };

  const finishWorkout = () => {
    const entries = day.exercises
      .map((ex) => {
        const inp = getInput(ex.id);
        const weight = parseFloat(inp.weight) || 0;
        const sets = parseInt(inp.sets) || 0;
        const reps = parseInt(inp.reps) || 0;
        if (weight <= 0 && sets <= 0 && reps <= 0) return null;
        return {
          id: uid(),
          exId: ex.id,
          dayId: day.id,
          exName: ex.name,
          weight,
          sets,
          reps,
          comment: comments[ex.id] || '',
          date: new Date().toLocaleDateString('ru-RU'),
        } as HistoryEntry;
      })
      .filter(Boolean) as HistoryEntry[];

    if (!entries.length) {
      notify('Сначала введите данные');
      return;
    }

    setHistory((prev) => [...entries.reverse(), ...prev]);
    notify(`Тренировка завершена: ${entries.length}`);
  };

  const moveBetweenLevels = (id: string) => {
    setDays((prev) => {
      const next = [...prev];
      const list = [...next[activeDay].exercises];
      const index = list.findIndex((ex) => ex.id === id);
      if (index === -1) return prev;

      const target = list[index];
      const updated = {
        ...target,
        type: target.type === 'основа' ? ('подсобка' as const) : ('основа' as const),
      };
      list[index] = updated;
      next[activeDay] = { ...next[activeDay], exercises: list };
      return next;
    });
    notify('Уровень упражнения изменён');
  };

  const moveExerciseInList = (fromId: string, toId: string) => {
    if (fromId === toId) return;

    setDays((prev) => {
      const next = [...prev];
      const list = [...next[activeDay].exercises];
      const fromIndex = list.findIndex((item) => item.id === fromId);
      const toIndex = list.findIndex((item) => item.id === toId);
      if (fromIndex === -1 || toIndex === -1) return prev;
      const [moved] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, moved);
      next[activeDay] = { ...next[activeDay], exercises: list };
      return next;
    });
  };

  const deleteExercise = (id: string) => {
    if (!confirm('Удалить упражнение?')) return;
    setDays((prev) => {
      const next = [...prev];
      next[activeDay] = {
        ...next[activeDay],
        exercises: next[activeDay].exercises.filter((item) => item.id !== id),
      };
      return next;
    });
    notify('Упражнение удалено');
  };

  const openEdit = (ex: Exercise) => {
    setFormName(ex.name);
    setFormType(ex.type);
    setFormIntensity(ex.intensity);
    setModal({ type: 'edit', exercise: ex });
  };

  const openAdd = () => {
    setFormName('');
    setFormType('подсобка');
    setFormIntensity('средние');
    setModal({ type: 'add' });
  };

  const saveModal = () => {
    if (!modal) return;

    if (modal.type === 'edit' && modal.exercise) {
      setDays((prev) => {
        const next = [...prev];
        next[activeDay] = {
          ...next[activeDay],
          exercises: next[activeDay].exercises.map((e) =>
            e.id === modal.exercise?.id
              ? { ...e, name: formName || e.name, type: formType, intensity: formIntensity }
              : e,
          ),
        };
        return next;
      });
      notify('Изменения сохранены');
    } else {
      const newEx: Exercise = {
        id: uid(),
        name: formName || 'Новое упражнение',
        type: formType,
        intensity: formIntensity,
      };
      setDays((prev) => {
        const next = [...prev];
        next[activeDay] = {
          ...next[activeDay],
          exercises: [...next[activeDay].exercises, newEx],
        };
        return next;
      });
      notify('Упражнение добавлено');
    }

    setModal(null);
  };

  const exportData = () => {
    const data = JSON.stringify({ days, history, theme, version: 2 }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `workout_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    notify('Файл сохранён');
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (data.days) setDays(data.days);
        if (data.history) setHistory(data.history);
        if (data.theme) setTheme(data.theme);
        notify('Данные восстановлены');
      } catch {
        notify('Ошибка чтения файла');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const resetAll = () => {
    if (!confirm('Удалить все данные?')) return;
    setDays(createDefaults());
    setHistory([]);
    setInputs({});
    setComments({});
    setShowCommentFor({});
    setShowHistoryFor({});
    localStorage.removeItem('wt_days');
    localStorage.removeItem('wt_history');
    notify('Все данные удалены');
  };

  const deleteHistoryEntry = (id: string) => {
    setHistory((prev) => prev.filter((h) => h.id !== id));
  };

  const today = new Date().toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const mainEx = useMemo(() => day.exercises.find((e) => e.type === 'основа'), [day]);
  const intensityLabel = mainEx ? mainEx.intensity.charAt(0).toUpperCase() + mainEx.intensity.slice(1) : '';
  const mainName = mainEx ? mainEx.name.toUpperCase() : day.name.toUpperCase();

  const intensityClass = (i: string) =>
    i === 'тяжёлые' ? 'badge-heavy' : i === 'средние' ? 'badge-medium' : 'badge-light';

  const currentTheme = THEMES.find((item) => item.key === theme) || THEMES[0];

  return (
    <>
      <header className="header">
        <div className="header-tools">
          <div className="header-spacer"></div>
          <div className="theme-picker-wrap">
            <button
              className="theme-toggle"
              onClick={() => setShowThemeMenu((prev) => !prev)}
              title="Темы"
            >
              🎨
            </button>
            {showThemeMenu && (
              <div className="theme-menu">
                {THEMES.map((item) => (
                  <button
                    key={item.key}
                    className={`theme-option ${theme === item.key ? 'active' : ''}`}
                    onClick={() => {
                      setTheme(item.key);
                      setShowThemeMenu(false);
                      notify(`Тема: ${item.name}`);
                    }}
                  >
                    <span>{item.icon}</span>
                    <span>{item.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="header-top">
          <span className="header-icon">💪</span>
          <span className="header-title">Трекер тренировок</span>
        </div>
        <div className="header-date">{today}</div>
        <div className="theme-caption">Тема: {currentTheme.name}</div>
      </header>

      <nav className="day-nav">
        <div className="day-nav-inner">
          {days.map((d, i) => (
            <button
              key={d.id}
              className={`day-tab ${i === activeDay ? 'active' : ''}`}
              onClick={() => {
                setActiveDay(i);
                setPage('workout');
              }}
            >
              <span className="day-tab-day">{d.day}</span>
              <span className="day-tab-name">{d.name}</span>
            </button>
          ))}
        </div>
      </nav>

      {page === 'workout' && (
        <main className="workout-section">
          <div className="workout-title">
            <span>{day.fullDay}</span> — {intensityLabel} {mainName}
          </div>

          {day.exercises.map((ex) => {
            const inp = getInput(ex.id);
            const exHist = getExHistory(ex.id);
            const lastResult = exHist[0];
            const isCommentOpen = showCommentFor[ex.id];
            const isHistoryOpen = showHistoryFor[ex.id];
            const isDragging = draggedExerciseId === ex.id;
            const isDragOver = dragOverId === ex.id;

            return (
              <div
                key={ex.id}
                className={`exercise-card ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''}`}
                draggable
                onDragStart={() => setDraggedExerciseId(ex.id)}
                onDragEnd={() => {
                  setDraggedExerciseId(null);
                  setDragOverId(null);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverId(ex.id);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggedExerciseId) moveExerciseInList(draggedExerciseId, ex.id);
                  setDraggedExerciseId(null);
                  setDragOverId(null);
                }}
              >
                <div className="exercise-header">
                  <div className="exercise-info">
                    <div className="exercise-name">{ex.name}</div>
                    <div className="exercise-badges">
                      <span className={`exercise-badge ${ex.type === 'основа' ? 'badge-main' : 'badge-sub'}`}>
                        <span className="badge-dot"></span>
                        {ex.type.toUpperCase()}
                      </span>
                      <span className={`exercise-badge ${intensityClass(ex.intensity)}`}>{ex.intensity}</span>
                    </div>
                  </div>

                  <div className="exercise-actions">
                    <button
                      className="btn-icon btn-level"
                      onClick={() => moveBetweenLevels(ex.id)}
                      title="Переместить между основой и подсобкой"
                    >
                      ↕
                    </button>
                    <button className="btn-icon btn-dragger" title="Перетащить карточку">
                      ⋮⋮
                    </button>
                    <button className="btn-icon btn-edit" onClick={() => openEdit(ex)} title="Редактировать">
                      ✎
                    </button>
                    <button className="btn-icon btn-del" onClick={() => deleteExercise(ex.id)} title="Удалить">
                      ✕
                    </button>
                  </div>
                </div>

                <div className="inputs-row compact-grid">
                  <div className="input-group">
                    <label className="input-label">Вес</label>
                    <input
                      className="input-field compact-input"
                      type="number"
                      inputMode="decimal"
                      value={inp.weight}
                      onChange={(e) => updateInput(ex.id, 'weight', e.target.value)}
                      onFocus={(e) => e.target.select()}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Подходы</label>
                    <input
                      className="input-field compact-input"
                      type="number"
                      inputMode="numeric"
                      value={inp.sets}
                      onChange={(e) => updateInput(ex.id, 'sets', e.target.value)}
                      onFocus={(e) => e.target.select()}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Повторы</label>
                    <input
                      className="input-field compact-input"
                      type="number"
                      inputMode="numeric"
                      value={inp.reps}
                      onChange={(e) => updateInput(ex.id, 'reps', e.target.value)}
                      onFocus={(e) => e.target.select()}
                    />
                  </div>
                </div>

                {isCommentOpen && (
                  <div className="comment-area">
                    <textarea
                      className="comment-input"
                      placeholder="Комментарий: хорошо, тяжело, боль, техника..."
                      value={comments[ex.id] || ''}
                      onChange={(e) => setComments((prev) => ({ ...prev, [ex.id]: e.target.value }))}
                    />
                  </div>
                )}

                {lastResult && (
                  <div className="last-result">
                    <strong>Последний:</strong> {lastResult.weight} кг × {lastResult.sets}×{lastResult.reps}
                    {lastResult.comment && <span className="result-comment"> — {lastResult.comment}</span>}
                    <span className="result-date"> ({lastResult.date})</span>
                  </div>
                )}

                <div className="save-area">
                  <button className="btn-save" onClick={() => saveExercise(ex)}>
                    💾 Сохранить
                  </button>
                  <button
                    className={`btn-comment-toggle ${isCommentOpen ? 'active' : ''}`}
                    onClick={() => setShowCommentFor((prev) => ({ ...prev, [ex.id]: !prev[ex.id] }))}
                    title="Комментарий"
                  >
                    📝
                  </button>
                </div>

                <div className="history-section">
                  <div className="history-header">
                    <span className="history-header-left">📊 История</span>
                    <button
                      className="history-toggle"
                      onClick={() => setShowHistoryFor((prev) => ({ ...prev, [ex.id]: !prev[ex.id] }))}
                    >
                      {isHistoryOpen ? 'скрыть' : 'показать'}
                    </button>
                  </div>

                  {isHistoryOpen && (
                    <div className="history-list">
                      {exHist.length === 0 ? (
                        <div className="history-empty">Нет записей</div>
                      ) : (
                        exHist.map((h) => (
                          <div key={h.id} className="history-item">
                            <span className="history-date">{h.date}</span>
                            <span className="history-data">{h.weight}кг × {h.sets}×{h.reps}</span>
                            {h.comment && <span className="history-comment">💬 {h.comment}</span>}
                            <button className="history-delete" onClick={() => deleteHistoryEntry(h.id)} title="Удалить запись">
                              ✕
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <button className="btn-add" onClick={openAdd}>
            + Добавить упражнение
          </button>

          <button className="btn-finish" onClick={finishWorkout}>
            🏁 Завершить тренировку
          </button>
        </main>
      )}

      {page === 'settings' && (
        <div className="settings-page">
          <div className="settings-title">⚙️ Настройки</div>

          <div className="settings-card">
            <div className="settings-card-title">🎨 Темы</div>
            <div className="theme-list-settings">
              {THEMES.map((item) => (
                <button
                  key={item.key}
                  className={`settings-btn theme-settings-btn ${theme === item.key ? 'active' : ''}`}
                  onClick={() => setTheme(item.key)}
                >
                  {item.icon} {item.name}
                </button>
              ))}
            </div>
          </div>

          <div className="settings-card">
            <div className="settings-card-title">💾 Резервная копия</div>
            <button className="settings-btn" onClick={exportData}>📤 Скачать данные</button>
            <button className="settings-btn" onClick={() => fileRef.current?.click()}>📥 Загрузить данные</button>
            <input ref={fileRef} type="file" accept=".json" className="hidden-input" onChange={importData} />
          </div>

          <div className="settings-card">
            <div className="settings-card-title">⚠️ Опасная зона</div>
            <button className="settings-btn settings-btn-danger" onClick={resetAll}>🗑️ Сбросить всё</button>
          </div>

          <div className="settings-info">
            Сохраняйте JSON-файл на телефон, чтобы потом восстановить весь дневник.
            Если браузер очистится или приложение удалится — просто загрузите файл обратно.
          </div>
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-title">{modal.type === 'edit' ? 'Редактировать упражнение' : 'Новое упражнение'}</div>

            <div className="modal-field">
              <label className="modal-label">Название</label>
              <input
                className="modal-input"
                type="text"
                placeholder="Название упражнения"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="modal-field">
              <label className="modal-label">Тип</label>
              <select className="modal-select" value={formType} onChange={(e) => setFormType(e.target.value as 'основа' | 'подсобка')}>
                <option value="основа">Основа</option>
                <option value="подсобка">Подсобка</option>
              </select>
            </div>

            <div className="modal-field">
              <label className="modal-label">Интенсивность</label>
              <select className="modal-select" value={formIntensity} onChange={(e) => setFormIntensity(e.target.value as 'тяжёлые' | 'средние' | 'лёгкие')}>
                <option value="тяжёлые">Тяжёлые</option>
                <option value="средние">Средние</option>
                <option value="лёгкие">Лёгкие</option>
              </select>
            </div>

            <div className="modal-actions">
              <button className="modal-btn modal-btn-cancel" onClick={() => setModal(null)}>Отмена</button>
              <button className="modal-btn modal-btn-confirm" onClick={saveModal}>{modal.type === 'edit' ? 'Сохранить' : 'Добавить'}</button>
            </div>
          </div>
        </div>
      )}

      <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>

      <nav className="bottom-nav">
        <button className={`bottom-btn ${page === 'workout' ? 'active' : ''}`} onClick={() => setPage('workout')}>
          <span className="bottom-icon">🏋️</span>
          <span className="bottom-label">Тренировка</span>
        </button>
        <button className={`bottom-btn ${page === 'settings' ? 'active' : ''}`} onClick={() => setPage('settings')}>
          <span className="bottom-icon">⚙️</span>
          <span className="bottom-label">Настройки</span>
        </button>
      </nav>
    </>
  );
}
