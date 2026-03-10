// main.js — bootstrap для модулей звонка
import { initCallManager, isJoined, getCurrentCount } from './callManager.js';
import './controls.js';
import * as media from './media.js';
import * as ui from './ui.js';

// Инициализация обработчиков сокета и состояния звонка
initCallManager();

// Первичное обновление UI (локальный стрим может быть ещё null)
ui.updateUI(isJoined(), getCurrentCount(), media.getLocalStream(), media.isVideoActive(), media.isScreenShareActive());
