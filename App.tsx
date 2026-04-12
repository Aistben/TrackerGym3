<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>💪 Силовой Дневник</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-tap-highlight-color: transparent;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(180deg, #0a0a12 0%, #0d0d1a 50%, #0a0a12 100%);
            color: #e0e0e0;
            min-height: 100vh;
            padding-bottom: 100px;
        }

        /* ===== ШАПКА ===== */
        .header {
            background: linear-gradient(135deg, #12122a 0%, #1a1a3a 50%, #0f1528 100%);
            padding: 20px;
            text-align: center;
            border-bottom: 2px solid #00d4ff33;
            position: sticky;
            top: 0;
            z-index: 100;
            box-shadow: 0 4px 30px rgba(0, 212, 255, 0.1);
        }

        .header h1 {
            font-size: 24px;
            background: linear-gradient(135deg, #00d4ff, #00ff88);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            text-shadow: 0 0 30px rgba(0, 212, 255, 0.5);
            margin-bottom: 8px;
        }

        .header-subtitle {
            font-size: 12px;
            color: #666;
            letter-spacing: 2px;
            text-transform: uppercase;
        }

        .week-info {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 15px;
            margin-top: 12px;
        }

        .week-badge {
            background: linear-gradient(135deg, #ff4444, #ff6b6b);
            color: #fff;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 700;
            box-shadow: 0 4px 15px rgba(255, 68, 68, 0.3);
        }

        .date-badge {
            color: #888;
            font-size: 12px;
        }

        /* ===== НАВИГАЦИЯ НЕДЕЛЬ ===== */
        .weeks-nav {
            display: flex;
            justify-content: center;
            gap: 8px;
            padding: 16px;
            background: linear-gradient(180deg, #0d0d1a, #0a0a12);
            flex-wrap: wrap;
        }

        .week-btn {
            padding: 10px 20px;
            border: 2px solid #1a1a3e;
            border-radius: 12px;
            background: linear-gradient(145deg, #12121f, #1a1a30);
            color: #666;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
        }

        .week-btn.active {
            border-color: #00d4ff;
            color: #00d4ff;
            background: linear-gradient(145deg, #0a1a2a, #102030);
            box-shadow: 0 0 20px rgba(0, 212, 255, 0.2), inset 0 0 20px rgba(0, 212, 255, 0.05);
        }

        .week-btn.completed {
            border-color: #00ff88;
            color: #00ff88;
            background: linear-gradient(145deg, #0a1a1a, #102020);
        }

        /* ===== НАВИГАЦИЯ ДНЕЙ ===== */
        .days-nav {
            display: flex;
            justify-content: center;
            gap: 10px;
            padding: 16px;
            background: #0a0a12;
        }

        .day-btn {
            flex: 1;
            max-width: 120px;
            padding: 14px 10px;
            border: 2px solid #1a1a3e;
            border-radius: 16px;
            background: linear-gradient(145deg, #12121f, #1a1a30);
            color: #666;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s;
            text-align: center;
        }

        .day-btn.active {
            border-color: #00d4ff;
            color: #00d4ff;
            background: linear-gradient(145deg, #0a1a2a, #102030);
            box-shadow: 0 0 25px rgba(0, 212, 255, 0.2);
            transform: scale(1.02);
        }

        .day-btn.done {
            border-color: #00ff88;
            color: #00ff88;
            background: linear-gradient(145deg, #0a1a15, #0d2018);
            box-shadow: 0 0 15px rgba(0, 255, 136, 0.15);
        }

        .day-btn span {
            display: block;
            font-size: 10px;
            color: #555;
            margin-top: 4px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .day-btn.active span {
            color: #00d4ff;
        }

        .day-btn.done span {
            color: #00ff88;
        }

        /* ===== КОНТЕНТ ===== */
        .workout-content {
            padding: 16px;
            max-width: 600px;
            margin: 0 auto;
        }

        .workout-day-title {
            font-size: 20px;
            text-align: center;
            margin-bottom: 20px;
            padding: 16px;
            background: linear-gradient(135deg, #14142a, #1a1a35);
            border-radius: 16px;
            border: 1px solid #252550;
        }

        .workout-day-title .emoji {
            font-size: 28px;
            display: block;
            margin-bottom: 8px;
        }

        .workout-day-title .title {
            color: #00d4ff;
            font-weight: 700;
        }

        /* ===== СЕКЦИЯ ===== */
        .section-label {
            display: flex;
            align-items: center;
            gap: 12px;
            margin: 24px 0 16px 0;
        }

        .section-label::before,
        .section-label::after {
            content: '';
            flex: 1;
            height: 1px;
            background: linear-gradient(90deg, transparent, #ff6b35, transparent);
        }

        .section-label span {
            font-size: 11px;
            font-weight: 700;
            color: #ff6b35;
            text-transform: uppercase;
            letter-spacing: 3px;
            white-space: nowrap;
        }

        .section-label.main::before,
        .section-label.main::after {
            background: linear-gradient(90deg, transparent, #ff4444, transparent);
        }

        .section-label.main span {
            color: #ff4444;
        }

        /* ===== КАРТОЧКА УПРАЖНЕНИЯ ===== */
        .exercise-card {
            background: linear-gradient(145deg, #14142a, #1a1a38);
            border: 1px solid #252550;
            border-radius: 20px;
            padding: 20px;
            margin-bottom: 16px;
            transition: all 0.3s;
            position: relative;
            overflow: hidden;
        }

        .exercise-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, #00d4ff, #00ff88);
            opacity: 0;
            transition: opacity 0.3s;
        }

        .exercise-card:hover::before {
            opacity: 1;
        }

        .exercise-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 16px;
        }

        .exercise-info {
            flex: 1;
        }

        .exercise-name {
            font-size: 18px;
            font-weight: 700;
            color: #fff;
            margin-bottom: 6px;
        }

        .exercise-intensity {
            display: inline-block;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 700;
            padding: 4px 10px;
            border-radius: 6px;
        }

        .intensity-heavy {
            color: #ff4444;
            background: rgba(255, 68, 68, 0.15);
            border: 1px solid rgba(255, 68, 68, 0.3);
        }

        .intensity-medium {
            color: #ffaa00;
            background: rgba(255, 170, 0, 0.15);
            border: 1px solid rgba(255, 170, 0, 0.3);
        }

        .intensity-light {
            color: #00ff88;
            background: rgba(0, 255, 136, 0.15);
            border: 1px solid rgba(0, 255, 136, 0.3);
        }

        .exercise-actions {
            display: flex;
            gap: 6px;
        }

        .action-btn {
            width: 36px;
            height: 36px;
            border: 1px solid #333;
            border-radius: 10px;
            background: #0a0a18;
            color: #666;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .action-btn:hover {
            border-color: #00d4ff;
            color: #00d4ff;
            background: rgba(0, 212, 255, 0.1);
        }

        .action-btn.delete:hover {
            border-color: #ff4444;
            color: #ff4444;
            background: rgba(255, 68, 68, 0.1);
        }

        /* ===== ПОЛЯ ВВОДА ===== */
        .inputs-row {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin-bottom: 16px;
        }

        .input-group {
            text-align: center;
        }

        .input-group label {
            display: block;
            font-size: 10px;
            color: #666;
            margin-bottom: 6px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .input-group input {
            width: 100%;
            padding: 14px 10px;
            border: 2px solid #252550;
            border-radius: 12px;
            background: linear-gradient(145deg, #0a0a15, #0d0d1a);
            color: #fff;
            font-size: 18px;
            font-weight: 700;
            text-align: center;
            outline: none;
            transition: all 0.3s;
        }

        .input-group input:focus {
            border-color: #00d4ff;
            box-shadow: 0 0 20px rgba(0, 212, 255, 0.2);
        }

        .input-group input::placeholder {
            color: #333;
        }

        /* ===== КОММЕНТАРИЙ ===== */
        .comment-section {
            margin-top: 12px;
        }

        .comment-toggle {
            width: 100%;
            padding: 10px;
            border: 1px dashed #333;
            border-radius: 10px;
            background: transparent;
            color: #555;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.3s;
        }

        .comment-toggle:hover {
            border-color: #00d4ff;
            color: #00d4ff;
        }

        .comment-area {
            display: none;
            margin-top: 12px;
        }

        .comment-area.show {
            display: block;
        }

        .comment-area textarea {
            width: 100%;
            padding: 12px;
            border: 1px solid #252550;
            border-radius: 12px;
            background: #0a0a15;
            color: #fff;
            font-size: 14px;
            resize: none;
            height: 80px;
            outline: none;
            font-family: inherit;
        }

        .comment-area textarea:focus {
            border-color: #00d4ff;
        }

        /* ===== ПОСЛЕДНИЙ РЕЗУЛЬТАТ ===== */
        .last-result {
            background: linear-gradient(135deg, rgba(0, 212, 255, 0.08), rgba(0, 255, 136, 0.05));
            border: 1px solid rgba(0, 212, 255, 0.2);
            border-radius: 12px;
            padding: 12px;
            margin-top: 12px;
        }

        .last-result-title {
            font-size: 10px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 6px;
        }

        .last-result-data {
            font-size: 14px;
            color: #00d4ff;
            font-weight: 600;
        }

        .last-result-comment {
            font-size: 12px;
            color: #888;
            margin-top: 6px;
            font-style: italic;
        }

        /* ===== ИСТОРИЯ ===== */
        .history-section {
            margin-top: 16px;
            border-top: 1px solid #252550;
            padding-top: 12px;
        }

        .history-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
            padding: 8px 0;
        }

        .history-title {
            font-size: 12px;
            color: #555;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .history-toggle {
            font-size: 12px;
            color: #00d4ff;
        }

        .history-list {
            display: none;
            margin-top: 12px;
        }

        .history-list.show {
            display: block;
        }

        .history-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px;
            background: #0a0a15;
            border-radius: 10px;
            margin-bottom: 8px;
        }

        .history-date {
            font-size: 12px;
            color: #555;
        }

        .history-data {
            font-size: 14px;
            color: #00d4ff;
            font-weight: 600;
        }

        .history-comment {
            font-size: 11px;
            color: #ffaa00;
        }

        /* ===== КНОПКИ ===== */
        .btn-finish {
            width: 100%;
            padding: 18px;
            border: none;
            border-radius: 16px;
            background: linear-gradient(135deg, #00d4ff, #00a0c0);
            color: #000;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s;
            margin-top: 20px;
            text-transform: uppercase;
            letter-spacing: 2px;
            box-shadow: 0 4px 25px rgba(0, 212, 255, 0.3);
        }

        .btn-finish:active {
            transform: scale(0.98);
        }

        .btn-add {
            width: 100%;
            padding: 16px;
            border: 2px dashed #333;
            border-radius: 16px;
            background: transparent;
            color: #555;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.3s;
            margin-top: 12px;
        }

        .btn-add:hover {
            border-color: #00d4ff;
            color: #00d4ff;
        }

        /* ===== НИЖНЯЯ ПАНЕЛЬ ===== */
        .bottom-bar {
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            background: linear-gradient(180deg, #12121f, #0a0a12);
            border-top: 1px solid #252550;
            padding: 12px 20px;
            display: flex;
            justify-content: space-around;
            z-index: 100;
            box-shadow: 0 -4px 30px rgba(0, 0, 0, 0.5);
        }

        .bottom-btn {
            background: none;
            border: none;
            color: #444;
            font-size: 11px;
            cursor: pointer;
            text-align: center;
            transition: all 0.3s;
            padding: 8px 16px;
            border-radius: 12px;
        }

        .bottom-btn.active {
            color: #00d4ff;
            background: rgba(0, 212, 255, 0.1);
        }

        .bottom-btn-icon {
            font-size: 22px;
            display: block;
            margin-bottom: 4px;
        }

        /* ===== СТРАНИЦЫ ===== */
        .page {
            display: none;
        }

        .page.active {
            display: block;
        }

        /* ===== МОДАЛЬНОЕ ОКНО ===== */
        .modal-overlay {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            z-index: 200;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }

        .modal-overlay.show {
            display: flex;
        }

        .modal {
            background: linear-gradient(145deg, #14142a, #1a1a38);
            border: 1px solid #252550;
            border-radius: 24px;
            padding: 28px;
            width: 100%;
            max-width: 400px;
            max-height: 85vh;
            overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        }

        .modal h2 {
            font-size: 20px;
            color: #00d4ff;
            margin-bottom: 24px;
            text-align: center;
        }

        .modal-group {
            margin-bottom: 20px;
        }

        .modal-label {
            font-size: 11px;
            color: #666;
            margin-bottom: 8px;
            display: block;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .modal-input {
            width: 100%;
            padding: 14px;
            border: 2px solid #252550;
            border-radius: 12px;
            background: #0a0a15;
            color: #fff;
            font-size: 16px;
            outline: none;
            transition: all 0.3s;
        }

        .modal-input:focus {
            border-color: #00d4ff;
        }

        .modal-select {
            width: 100%;
            padding: 14px;
            border: 2px solid #252550;
            border-radius: 12px;
            background: #0a0a15;
            color: #fff;
            font-size: 16px;
            outline: none;
            cursor: pointer;
            appearance: none;
        }

        .modal-buttons {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-top: 24px;
        }

        .modal-btn {
            padding: 14px;
            border: none;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s;
        }

        .modal-btn.confirm {
            background: linear-gradient(135deg, #00d4ff, #00a0c0);
            color: #000;
        }

        .modal-btn.cancel {
            background: #252550;
            color: #888;
        }

        /* ===== НАСТРОЙКИ ===== */
        .settings-page {
            padding: 20px;
            max-width: 500px;
            margin: 0 auto;
        }

        .settings-title {
            font-size: 24px;
            color: #00d4ff;
            text-align: center;
            margin-bottom: 24px;
        }

        .settings-card {
            background: linear-gradient(145deg, #14142a, #1a1a38);
            border: 1px solid #252550;
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 16px;
        }

        .settings-card h3 {
            font-size: 14px;
            color: #888;
            margin-bottom: 16px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .settings-btn {
            width: 100%;
            padding: 16px;
            border: 1px solid #333;
            border-radius: 12px;
            background: #0a0a15;
            color: #888;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.3s;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .settings-btn:last-child {
            margin-bottom: 0;
        }

        .settings-btn:hover {
            border-color: #00d4ff;
            color: #00d4ff;
        }

        .settings-btn.danger {
            border-color: #ff4444;
            color: #ff4444;
        }

        .settings-btn .icon {
            font-size: 20px;
        }

        /* ===== TOAST ===== */
        .toast {
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%) translateY(20px);
            background: linear-gradient(135deg, #00d4ff, #00ff88);
            color: #000;
            padding: 14px 28px;
            border-radius: 14px;
            font-size: 14px;
            font-weight: 700;
            opacity: 0;
            transition: all 0.3s;
            z-index: 300;
            white-space: nowrap;
            box-shadow: 0 4px 20px rgba(0, 212, 255, 0.4);
        }

        .toast.show {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }

        .toast.error {
            background: linear-gradient(135deg, #ff4444, #ff6b6b);
        }

        /* ===== СТАТИСТИКА ===== */
        .stats-page {
            padding: 20px;
            max-width: 500px;
            margin: 0 auto;
        }

        .stats-card {
            background: linear-gradient(145deg, #14142a, #1a1a38);
            border: 1px solid #252550;
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 16px;
            text-align: center;
        }

        .stats-number {
            font-size: 48px;
            font-weight: 700;
            background: linear-gradient(135deg, #00d4ff, #00ff88);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .stats-label {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-top: 8px;
        }

        /* Скрытый input для импорта */
        #importInput {
            display: none;
        }
    </style>
</head>
<body>

    <!-- HEADER -->
    <div class="header">
        <h1>💪 СИЛОВОЙ ДНЕВНИК</h1>
        <div class="header-subtitle">Тренировочная программа</div>
        <div class="week-info">
            <div class="week-badge" id="currentWeekBadge">Неделя 1</div>
            <div class="date-badge" id="currentDate"></div>
        </div>
    </div>

    <!-- СТРАНИЦА ТРЕНИРОВОК -->
    <div class="page active" id="page-workout">
        
        <!-- Навигация по неделям -->
        <div class="weeks-nav" id="weeksNav"></div>
        
        <!-- Навигация по дням -->
        <div class="days-nav" id="daysNav"></div>
        
        <!-- Контент тренировки -->
        <div class="workout-content" id="workoutContent"></div>
    </div>

    <!-- СТРАНИЦА СТАТИСТИКИ -->
    <div class="page" id="page-stats">
        <div class="stats-page">
            <h2 class="settings-title">📊 Статистика</h2>
            <div class="stats-card">
                <div class="stats-number" id="totalWorkouts">0</div>
                <div class="stats-label">Тренировок выполнено</div>
            </div>
            <div class="stats-card">
                <div class="stats-number" id="totalExercises">0</div>
                <div class="stats-label">Упражнений записано</div>
            </div>
            <div class="stats-card">
                <div class="stats-number" id="currentStreak">0</div>
                <div class="stats-label">Текущая серия (дней)</div>
            </div>
        </div>
    </div>

    <!-- СТРАНИЦА НАСТРОЕК -->
    <div class="page" id="page-settings">
        <div class="settings-page">
            <h2 class="settings-title">⚙️ Настройки</h2>
            
            <div class="settings-card">
                <h3>💾 Данные</h3>
                <button class="settings-btn" onclick="exportData()">
                    <span class="icon">📤</span>
                    <span>Экспорт в JSON файл</span>
                </button>
                <button class="settings-btn" onclick="document.getElementById('importInput').click()">
                    <span class="icon">📥</span>
                    <span>Импорт из JSON файла</span>
                </button>
                <input type="file" id="importInput" accept=".json" onchange="importData(event)">
            </div>
            
            <div class="settings-card">
                <h3>🔄 Сброс</h3>
                <button class="settings-btn" onclick="resetProgress()">
                    <span class="icon">🔄</span>
                    <span>Сбросить прогресс</span>
                </button>
                <button class="settings-btn danger" onclick="resetAll()">
                    <span class="icon">🗑️</span>
                    <span>Удалить все данные</span>
                </button>
            </div>
        </div>
    </div>

    <!-- НИЖНЯЯ ПАНЕЛЬ -->
    <div class="bottom-bar">
        <button class="bottom-btn active" onclick="showPage('workout')">
            <span class="bottom-btn-icon">🏋️</span>
            <span>Тренировка</span>
        </button>
        <button class="bottom-btn" onclick="showPage('stats')">
            <span class="bottom-btn-icon">📊</span>
            <span>Статистика</span>
        </button>
        <button class="bottom-btn" onclick="showPage('settings')">
            <span class="bottom-btn-icon">⚙️</span>
            <span>Настройки</span>
        </button>
    </div>

    <!-- МОДАЛЬНОЕ ОКНО РЕДАКТИРОВАНИЯ -->
    <div class="modal-overlay" id="editModal">
        <div class="modal">
            <h2>✏️ Редактировать упражнение</h2>
            <div class="modal-group">
                <label class="modal-label">Название</label>
                <input type="text" class="modal-input" id="editName" placeholder="Название упражнения">
            </div>
            <div class="modal-group">
                <label class="modal-label">Интенсивность</label>
                <select class="modal-select" id="editIntensity">
                    <option value="heavy">🔴 Тяжёлая</option>
                    <option value="medium">🟡 Средняя</option>
                    <option value="light">🟢 Лёгкая</option>
                </select>
            </div>
            <div class="modal-group">
                <label class="modal-label">Тип</label>
                <select class="modal-select" id="editType">
                    <option value="main">Основное</option>
                    <option value="accessory">Подсобное</option>
                </select>
            </div>
            <div class="modal-buttons">
                <button class="modal-btn cancel" onclick="closeEditModal()">Отмена</button>
                <button class="modal-btn confirm" onclick="saveExerciseEdit()">Сохранить</button>
            </div>
        </div>
    </div>

    <!-- МОДАЛЬНОЕ ОКНО ДОБАВЛЕНИЯ -->
    <div class="modal-overlay" id="addModal">
        <div class="modal">
            <h2>➕ Добавить упражнение</h2>
            <div class="modal-group">
                <label class="modal-label">Название</label>
                <input type="text" class="modal-input" id="addName" placeholder="Название упражнения">
            </div>
            <div class="modal-group">
                <label class="modal-label">Интенсивность</label>
                <select class="modal-select" id="addIntensity">
                    <option value="heavy">🔴 Тяжёлая</option>
                    <option value="medium">🟡 Средняя</option>
                    <option value="light">🟢 Лёгкая</option>
                </select>
            </div>
            <div class="modal-group">
                <label class="modal-label">Тип</label>
                <select class="modal-select" id="addType">
                    <option value="main">Основное</option>
                    <option value="accessory">Подсобное</option>
                </select>
            </div>
            <div class="modal-buttons">
                <button class="modal-btn cancel" onclick="closeAddModal()">Отмена</button>
                <button class="modal-btn confirm" onclick="addNewExercise()">Добавить</button>
            </div>
        </div>
    </div>

    <!-- TOAST -->
    <div class="toast" id="toast"></div>

    <script>
        // ===== ДАННЫЕ =====
        const DEFAULT_PROGRAM = {
            weeks: 4,
            days: [
                {
                    name: 'Понедельник',
                    shortName: 'ПН',
                    emoji: '💪',
                    focus: 'Жим + Грудь',
                    exercises: [
                        { id: 1, name: 'Жим лёжа', type: 'main', intensity: 'heavy' },
                        { id: 2, name: 'Брусья', type: 'accessory', intensity: 'medium' },
                        { id: 3, name: 'Жим гантелей', type: 'accessory', intensity: 'light' },
                        { id: 4, name: 'Разводка', type: 'accessory', intensity: 'light' }
                    ]
                },
                {
                    name: 'Среда',
                    shortName: 'СР',
                    emoji: '🎯',
                    focus: 'Тяга + Спина',
                    exercises: [
                        { id: 5, name: 'Подтягивания', type: 'main', intensity: 'heavy' },
                        { id: 6, name: 'Тяга штанги', type: 'accessory', intensity: 'medium' },
                        { id: 7, name: 'Тяга гантели', type: 'accessory', intensity: 'light' },
                        { id: 8, name: 'Бицепс', type: 'accessory', intensity: 'light' }
                    ]
                },
                {
                    name: 'Пятница',
                    shortName: 'ПТ',
                    emoji: '🔥',
                    focus: 'Присед + Ноги',
                    exercises: [
                        { id: 9, name: 'Приседания', type: 'main', intensity: 'heavy' },
                        { id: 10, name: 'Жим ногами', type: 'accessory', intensity: 'medium' },
                        { id: 11, name: 'Румынская тяга', type: 'accessory', intensity: 'medium' },
                        { id: 12, name: 'Икры', type: 'accessory', intensity: 'light' }
                    ]
                }
            ]
        };

        let appData = {
            program: JSON.parse(JSON.stringify(DEFAULT_PROGRAM)),
            currentWeek: 1,
            currentDay: 0,
            workouts: {}, // { "1-0": { completed: true, date: "...", exercises: {...} } }
            history: {}   // { "Жим лёжа": [ {date, weight, sets, reps, comment}, ... ] }
        };

        let editingExercise = null;
        let nextExerciseId = 100;

        // ===== ИНИЦИАЛИЗАЦИЯ =====
        function init() {
            loadData();
            renderWeeksNav();
            renderDaysNav();
            renderWorkout();
            updateDate();
            updateStats();
        }

        function loadData() {
            const saved = localStorage.getItem('powerDiary');
            if (saved) {
                try {
                    appData = JSON.parse(saved);
                    // Найти максимальный ID
                    appData.program.days.forEach(day => {
                        day.exercises.forEach(ex => {
                            if (ex.id >= nextExerciseId) nextExerciseId = ex.id + 1;
                        });
                    });
                } catch(e) {
                    console.error('Ошибка загрузки данных');
                }
            }
        }

        function saveData() {
            localStorage.setItem('powerDiary', JSON.stringify(appData));
        }

        function updateDate() {
            const now = new Date();
            const options = { day: 'numeric', month: 'long', year: 'numeric' };
            document.getElementById('currentDate').textContent = now.toLocaleDateString('ru-RU', options);
        }

        // ===== НАВИГАЦИЯ =====
        function renderWeeksNav() {
            const container = document.getElementById('weeksNav');
            container.innerHTML = '';
            
            for (let w = 1; w <= appData.program.weeks; w++) {
                const btn = document.createElement('button');
                btn.className = 'week-btn' + (w === appData.currentWeek ? ' active' : '');
                
                // Проверяем завершена ли неделя
                const allDone = [0, 1, 2].every(d => {
                    const key = `${w}-${d}`;
                    return appData.workouts[key]?.completed;
                });
                if (allDone) btn.classList.add('completed');
                
                btn.textContent = `Неделя ${w}`;
                btn.onclick = () => selectWeek(w);
                container.appendChild(btn);
            }
            
            document.getElementById('currentWeekBadge').textContent = `Неделя ${appData.currentWeek}`;
        }

        function renderDaysNav() {
            const container = document.getElementById('daysNav');
            container.innerHTML = '';
            
            appData.program.days.forEach((day, index) => {
                const btn = document.createElement('button');
                btn.className = 'day-btn' + (index === appData.currentDay ? ' active' : '');
                
                const key = `${appData.currentWeek}-${index}`;
                if (appData.workouts[key]?.completed) {
                    btn.classList.add('done');
                }
                
                btn.innerHTML = `${day.shortName}<span>${day.focus}</span>`;
                btn.onclick = () => selectDay(index);
                container.appendChild(btn);
            });
        }

        function selectWeek(week) {
            appData.currentWeek = week;
            saveData();
            renderWeeksNav();
            renderDaysNav();
            renderWorkout();
        }

        function selectDay(day) {
            appData.currentDay = day;
            saveData();
            renderDaysNav();
            renderWorkout();
        }

        // ===== РЕНДЕР ТРЕНИРОВКИ =====
        function renderWorkout() {
            const container = document.getElementById('workoutContent');
            const day = appData.program.days[appData.currentDay];
            const workoutKey = `${appData.currentWeek}-${appData.currentDay}`;
            const workoutData = appData.workouts[workoutKey] || { exercises: {} };
            
            let html = `
                <div class="workout-day-title">
                    <span class="emoji">${day.emoji}</span>
                    <span class="title">${day.name} — ${day.focus}</span>
                </div>
            `;
            
            // Основные упражнения
            const mainExercises = day.exercises.filter(e => e.type === 'main');
            const accessoryExercises = day.exercises.filter(e => e.type === 'accessory');
            
            if (mainExercises.length > 0) {
                html += `<div class="section-label main"><span>🎯 Основное</span></div>`;
                mainExercises.forEach((ex, idx) => {
                    html += renderExerciseCard(ex, workoutData.exercises[ex.id], day.exercises.indexOf(ex), day.exercises.length);
                });
            }
            
            if (accessoryExercises.length > 0) {
                html += `<div class="section-label"><span>💪 Подсобные</span></div>`;
                accessoryExercises.forEach((ex, idx) => {
                    html += renderExerciseCard(ex, workoutData.exercises[ex.id], day.exercises.indexOf(ex), day.exercises.length);
                });
            }
            
            html += `
                <button class="btn-add" onclick="openAddModal()">
                    ➕ Добавить упражнение
                </button>
                <button class="btn-finish" onclick="finishWorkout()">
                    ✅ ЗАВЕРШИТЬ ТРЕНИРОВКУ
                </button>
            `;
            
            container.innerHTML = html;
        }

        function renderExerciseCard(exercise, savedData, index, total) {
            const data = savedData || {};
            const lastResult = getLastResult(exercise.name);
            const history = appData.history[exercise.name] || [];
            
            const intensityClass = `intensity-${exercise.intensity}`;
            const intensityText = exercise.intensity === 'heavy' ? 'Тяжёлая' : 
                                  exercise.intensity === 'medium' ? 'Средняя' : 'Лёгкая';
            
            let html = `
                <div class="exercise-card" data-id="${exercise.id}">
                    <div class="exercise-header">
                        <div class="exercise-info">
                            <div class="exercise-name">${exercise.name}</div>
                            <span class="exercise-intensity ${intensityClass}">${intensityText}</span>
                        </div>
                        <div class="exercise-actions">
                            <button class="action-btn" onclick="moveExercise(${exercise.id}, -1)" ${index === 0 ? 'disabled style="opacity:0.3"' : ''}>↑</button>
                            <button class="action-btn" onclick="moveExercise(${exercise.id}, 1)" ${index === total-1 ? 'disabled style="opacity:0.3"' : ''}>↓</button>
                            <button class="action-btn" onclick="openEditModal(${exercise.id})">✏️</button>
                            <button class="action-btn delete" onclick="deleteExercise(${exercise.id})">🗑️</button>
                        </div>
                    </div>
                    
                    <div class="inputs-row">
                        <div class="input-group">
                            <label>Вес (кг)</label>
                            <input type="number" id="weight-${exercise.id}" value="${data.weight || ''}" 
                                   placeholder="0" onchange="saveExerciseData(${exercise.id})">
                        </div>
                        <div class="input-group">
                            <label>Подходы</label>
                            <input type="number" id="sets-${exercise.id}" value="${data.sets || ''}" 
                                   placeholder="0" onchange="saveExerciseData(${exercise.id})">
                        </div>
                        <div class="input-group">
                            <label>Повторы</label>
                            <input type="number" id="reps-${exercise.id}" value="${data.reps || ''}" 
                                   placeholder="0" onchange="saveExerciseData(${exercise.id})">
                        </div>
                    </div>
                    
                    <div class="comment-section">
                        <button class="comment-toggle" onclick="toggleComment(${exercise.id})">
                            💬 ${data.comment ? 'Редактировать комментарий' : 'Добавить комментарий'}
                        </button>
                        <div class="comment-area ${data.comment ? 'show' : ''}" id="comment-area-${exercise.id}">
                            <textarea id="comment-${exercise.id}" placeholder="Как прошло? Ощущения, заметки..."
                                      onchange="saveExerciseData(${exercise.id})">${data.comment || ''}</textarea>
                        </div>
                    </div>
            `;
            
            if (lastResult) {
                html += `
                    <div class="last-result">
                        <div class="last-result-title">Последний результат (${lastResult.date})</div>
                        <div class="last-result-data">${lastResult.weight} кг × ${lastResult.sets} × ${lastResult.reps}</div>
                        ${lastResult.comment ? `<div class="last-result-comment">"${lastResult.comment}"</div>` : ''}
                    </div>
                `;
            }
            
            if (history.length > 0) {
                html += `
                    <div class="history-section">
                        <div class="history-header" onclick="toggleHistory(${exercise.id})">
                            <span class="history-title">📋 История (${history.length})</span>
                            <span class="history-toggle" id="history-toggle-${exercise.id}">Показать ▼</span>
                        </div>
                        <div class="history-list" id="history-list-${exercise.id}">
                            ${history.slice(0, 10).map(h => `
                                <div class="history-item">
                                    <span class="history-date">${h.date}</span>
                                    <span class="history-data">${h.weight} кг × ${h.sets} × ${h.reps}</span>
                                    ${h.comment ? `<span class="history-comment">💬</span>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }
            
            html += `</div>`;
            return html;
        }

        function getLastResult(exerciseName) {
            const history = appData.history[exerciseName];
            if (history && history.length > 0) {
                return history[0];
            }
            return null;
        }

        // ===== ДЕЙСТВИЯ С УПРАЖНЕНИЯМИ =====
        function saveExerciseData(exerciseId) {
            const workoutKey = `${appData.currentWeek}-${appData.currentDay}`;
            if (!appData.workouts[workoutKey]) {
                appData.workouts[workoutKey] = { exercises: {}, completed: false };
            }
            
            const weight = document.getElementById(`weight-${exerciseId}`)?.value || '';
            const sets = document.getElementById(`sets-${exerciseId}`)?.value || '';
            const reps = document.getElementById(`reps-${exerciseId}`)?.value || '';
            const comment = document.getElementById(`comment-${exerciseId}`)?.value || '';
            
            appData.workouts[workoutKey].exercises[exerciseId] = {
                weight, sets, reps, comment
            };
            
            saveData();
        }

        function toggleComment(exerciseId) {
            const area = document.getElementById(`comment-area-${exerciseId}`);
            area.classList.toggle('show');
        }

        function toggleHistory(exerciseId) {
            const list = document.getElementById(`history-list-${exerciseId}`);
            const toggle = document.getElementById(`history-toggle-${exerciseId}`);
            list.classList.toggle('show');
            toggle.textContent = list.classList.contains('show') ? 'Скрыть ▲' : 'Показать ▼';
        }

        function moveExercise(exerciseId, direction) {
            const day = appData.program.days[appData.currentDay];
            const index = day.exercises.findIndex(e => e.id === exerciseId);
            const newIndex = index + direction;
            
            if (newIndex < 0 || newIndex >= day.exercises.length) return;
            
            // Меняем местами
            [day.exercises[index], day.exercises[newIndex]] = [day.exercises[newIndex], day.exercises[index]];
            
            saveData();
            renderWorkout();
            showToast('Упражнение перемещено');
        }

        function deleteExercise(exerciseId) {
            if (!confirm('Удалить это упражнение?')) return;
            
            const day = appData.program.days[appData.currentDay];
            day.exercises = day.exercises.filter(e => e.id !== exerciseId);
            
            saveData();
            renderWorkout();
            showToast('Упражнение удалено');
        }

        // ===== МОДАЛЬНЫЕ ОКНА =====
        function openEditModal(exerciseId) {
            const day = appData.program.days[appData.currentDay];
            const exercise = day.exercises.find(e => e.id === exerciseId);
            if (!exercise) return;
            
            editingExercise = exercise;
            document.getElementById('editName').value = exercise.name;
            document.getElementById('editIntensity').value = exercise.intensity;
            document.getElementById('editType').value = exercise.type;
            document.getElementById('editModal').classList.add('show');
        }

        function closeEditModal() {
            document.getElementById('editModal').classList.remove('show');
            editingExercise = null;
        }

        function saveExerciseEdit() {
            if (!editingExercise) return;
            
            editingExercise.name = document.getElementById('editName').value || 'Упражнение';
            editingExercise.intensity = document.getElementById('editIntensity').value;
            editingExercise.type = document.getElementById('editType').value;
            
            saveData();
            closeEditModal();
            renderWorkout();
            showToast('Изменения сохранены');
        }

        function openAddModal() {
            document.getElementById('addName').value = '';
            document.getElementById('addIntensity').value = 'medium';
            document.getElementById('addType').value = 'accessory';
            document.getElementById('addModal').classList.add('show');
        }

        function closeAddModal() {
            document.getElementById('addModal').classList.remove('show');
        }

        function addNewExercise() {
            const name = document.getElementById('addName').value || 'Новое упражнение';
            const intensity = document.getElementById('addIntensity').value;
            const type = document.getElementById('addType').value;
            
            const day = appData.program.days[appData.currentDay];
            day.exercises.push({
                id: nextExerciseId++,
                name: name,
                type: type,
                intensity: intensity
            });
            
            saveData();
            closeAddModal();
            renderWorkout();
            showToast('Упражнение добавлено');
        }

        // ===== ЗАВЕРШЕНИЕ ТРЕНИРОВКИ =====
        function finishWorkout() {
            const workoutKey = `${appData.currentWeek}-${appData.currentDay}`;
            const day = appData.program.days[appData.currentDay];
            
            if (!appData.workouts[workoutKey]) {
                appData.workouts[workoutKey] = { exercises: {}, completed: false };
            }
            
            // Сохраняем все данные в историю
            day.exercises.forEach(exercise => {
                const data = appData.workouts[workoutKey].exercises[exercise.id];
                if (data && (data.weight || data.sets || data.reps)) {
                    if (!appData.history[exercise.name]) {
                        appData.history[exercise.name] = [];
                    }
                    
                    const now = new Date();
                    const dateStr = now.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
                    
                    appData.history[exercise.name].unshift({
                        date: dateStr,
                        weight: data.weight || '0',
                        sets: data.sets || '0',
                        reps: data.reps || '0',
                        comment: data.comment || ''
                    });
                    
                    // Ограничиваем историю 50 записями
                    if (appData.history[exercise.name].length > 50) {
                        appData.history[exercise.name] = appData.history[exercise.name].slice(0, 50);
                    }
                }
            });
            
            appData.workouts[workoutKey].completed = true;
            appData.workouts[workoutKey].completedDate = new Date().toISOString();
            
            saveData();
            renderWeeksNav();
            renderDaysNav();
            renderWorkout();
            updateStats();
            showToast('🎉 Тренировка завершена!');
        }

        // ===== СТРАНИЦЫ =====
        function showPage(page) {
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            document.querySelectorAll('.bottom-btn').forEach(b => b.classList.remove('active'));
            
            document.getElementById(`page-${page}`).classList.add('active');
            event.target.closest('.bottom-btn').classList.add('active');
            
            if (page === 'stats') {
                updateStats();
            }
        }

        function updateStats() {
            let totalWorkouts = 0;
            let totalExercises = 0;
            
            Object.values(appData.workouts).forEach(w => {
                if (w.completed) totalWorkouts++;
            });
            
            Object.values(appData.history).forEach(h => {
                totalExercises += h.length;
            });
            
            document.getElementById('totalWorkouts').textContent = totalWorkouts;
            document.getElementById('totalExercises').textContent = totalExercises;
            document.getElementById('currentStreak').textContent = Math.floor(totalWorkouts / 3);
        }

        // ===== НАСТРОЙКИ =====
        function exportData() {
            const dataStr = JSON.stringify(appData, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `силовой_дневник_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showToast('📤 Данные экспортированы');
        }

        function importData(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const imported = JSON.parse(e.target.result);
                    appData = imported;
                    saveData();
                    init();
                    showToast('📥 Данные импортированы');
                } catch(err) {
                    showToast('❌ Ошибка импорта', true);
                }
            };
            reader.readAsText(file);
            event.target.value = '';
        }

        function resetProgress() {
            if (!confirm('Сбросить весь прогресс? Программа тренировок сохранится.')) return;
            
            appData.workouts = {};
            appData.history = {};
            appData.currentWeek = 1;
            appData.currentDay = 0;
            
            saveData();
            init();
            showToast('🔄 Прогресс сброшен');
        }

        function resetAll() {
            if (!confirm('УДАЛИТЬ ВСЕ ДАННЫЕ? Это действие необратимо!')) return;
            if (!confirm('Вы уверены? Все данные будут потеряны навсегда!')) return;
            
            localStorage.removeItem('powerDiary');
            appData = {
                program: JSON.parse(JSON.stringify(DEFAULT_PROGRAM)),
                currentWeek: 1,
                currentDay: 0,
                workouts: {},
                history: {}
            };
            
            init();
            showToast('🗑️ Все данные удалены');
        }

        // ===== TOAST =====
        function showToast(message, isError = false) {
            const toast = document.getElementById('toast');
            toast.textContent = message;
            toast.className = 'toast show' + (isError ? ' error' : '');
            
            setTimeout(() => {
                toast.classList.remove('show');
            }, 2500);
        }

        // ===== ЗАПУСК =====
        init();
    </script>
</body>
</html>
