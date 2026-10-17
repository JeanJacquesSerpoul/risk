import { useGame } from '../game/store'
import { openDialog } from '../game/ui'
import { LANG_LABEL, LANGS } from '../i18n'
import { langOf, useT } from '../i18n/useT'
import { ChoiceRow, Modal } from './Modal'

/** Device settings: language, theme, sound, speed and the help for human players. */
export function SettingsDialog() {
  const settings = useGame((s) => s.settings)
  const lang = useGame(langOf)
  const update = useGame((s) => s.updateSettings)
  const { t } = useT()
  const onOff = [
    { value: true, label: 'ON' },
    { value: false, label: 'OFF' },
  ]
  return (
    <Modal title={t('settings.title').toUpperCase()} subtitle={t('settings.subtitle')} onClose={() => openDialog(null)}>
      <ChoiceRow label={t('settings.language')} value={lang} options={LANGS.map((l) => ({ value: l, label: LANG_LABEL[l] }))} onChange={(l) => update({ lang: l })} />
      <ChoiceRow
        label={t('settings.theme')}
        value={settings.theme ?? 'system'}
        options={(['system', 'light', 'dark'] as const).map((m) => ({ value: m, label: t(`theme.${m}`).toUpperCase() }))}
        onChange={(m) => update({ theme: m })}
      />
      <ChoiceRow label={t('settings.sound')} value={settings.sound} options={onOff} onChange={(v) => update({ sound: v })} />
      <ChoiceRow
        label={t('settings.speed')}
        value={settings.speed}
        options={[1, 2, 4].map((v) => ({ value: v, label: `×${v}` }))}
        onChange={(v) => update({ speed: v })}
      />
      <ChoiceRow
        label={t('settings.advisor')}
        hint={t('settings.advisorHint')}
        value={settings.advisor !== false}
        options={onOff}
        onChange={(v) => update({ advisor: v })}
      />
      <ChoiceRow
        label={t('settings.passDevice')}
        hint={t('settings.passDeviceHint')}
        value={settings.passDevice !== false}
        options={onOff}
        onChange={(v) => update({ passDevice: v })}
      />
      <ChoiceRow label={t('settings.voice')} value={settings.voice !== false} options={onOff} onChange={(v) => update({ voice: v })} />
    </Modal>
  )
}
