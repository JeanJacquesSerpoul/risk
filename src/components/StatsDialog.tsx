import { useState } from 'react'
import { useGame } from '../game/store'
import { useResolvedTheme } from '../game/theme'
import { openDialog } from '../game/ui'
import { useT } from '../i18n/useT'
import { ForcesChart, ForcesTable, lineColor, type Measure } from './ForcesChart'
import { InsigniaIcon } from './Insignia'
import { Modal } from './Modal'

/** Armies / territories over the game: controls in one row, legend, then the chart or its table. */
export function ForcesPanel({ height }: { height?: number }) {
  const history = useGame((s) => s.history)
  const players = useGame((s) => s.players)
  const theme = useResolvedTheme()
  const [measure, setMeasure] = useState<Measure>('armies')
  const [table, setTable] = useState(false)
  const { t } = useT()
  return (
    <div className="text-left">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1" role="group" aria-label={t('stats.measure')}>
          {(['armies', 'territories'] as const).map((m) => (
            <button key={m} className="chip" data-on={measure === m} onClick={() => setMeasure(m)}>
              {t(`stats.${m}`)}
            </button>
          ))}
        </div>
        <div className="flex gap-1" role="group" aria-label={t('stats.view')}>
          <button className="chip" data-on={!table} onClick={() => setTable(false)}>
            {t('stats.chart')}
          </button>
          <button className="chip" data-on={table} onClick={() => setTable(true)}>
            {t('stats.table')}
          </button>
        </div>
      </div>
      {!table && (
        <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold">
          {players.map((p) => (
            <li key={p.id} className={`flex items-center gap-1.5 ${p.alive ? '' : 'text-fg/50 line-through'}`}>
              <InsigniaIcon seat={p.id} color={lineColor(p.color, theme)} size={10} />
              {p.name}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2">
        {table ? (
          <ForcesTable history={history} players={players} measure={measure} />
        ) : (
          <ForcesChart history={history} players={players} measure={measure} height={height} />
        )}
      </div>
    </div>
  )
}

export function StatsDialog() {
  const { t } = useT()
  return (
    <Modal wide title={t('stats.title').toUpperCase()} subtitle={t('stats.subtitle')} onClose={() => openDialog(null)}>
      <ForcesPanel />
    </Modal>
  )
}
