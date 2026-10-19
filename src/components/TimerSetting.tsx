import { STORAGE_KEYS } from '../utils/constants';
import { timerMinutes } from '../state';
import { t } from '../i18n';

export function TimerSetting() {
  const handleChange = (e: Event) => {
    const val = parseFloat((e.target as HTMLInputElement).value);
    if (isNaN(val) || val <= 0) return;
    timerMinutes.value = val;
    localStorage.setItem(STORAGE_KEYS.timerMinutes, String(val));
  };

  return (
    <div class="setting">
      <label class="setting__label" for="timer-limit">{t('data', 'timerLimit')}</label>
      <input
        id="timer-limit"
        type="number"
        class="setting__input"
        min={0.1}
        step={0.5}
        value={timerMinutes.value}
        onChange={handleChange}
      />
    </div>
  );
}
