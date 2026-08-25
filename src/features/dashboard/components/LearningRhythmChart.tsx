import { useMemo } from 'react'

import { defineChart, lineY } from '@tanstack/charts'
import { Chart } from '@tanstack/charts/react'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { scalePoint } from '@tanstack/charts/scales/point'
import { tooltip } from '@tanstack/charts/tooltip'

const MIN_POINTS_TO_RENDER = 3
const MAX_X_TICKS = 6
const Y_TICK_COUNT = 4
const CHART_HEIGHT = 230
const CHART_INITIAL_WIDTH = 720

export type LearningRhythmPoint = {
  id: string
  label: string
  deviation: number
}

type LearningRhythmChartProps = {
  data: LearningRhythmPoint[]
}

export function LearningRhythmChart({ data }: LearningRhythmChartProps) {
  const definition = useMemo(
    () =>
      defineChart({
        marks: [
          lineY(data, {
            id: 'learning-rhythm',
            x: 'label',
            y: 'deviation',
            points: true,
            stroke: 'var(--veridian)',
            strokeWidth: 2.5,
          }),
        ],
        x: {
          scale: () => scalePoint<string>().padding(0.15),
          axis: { ticks: { count: Math.min(MAX_X_TICKS, data.length) } },
        },
        y: {
          scale: scaleLinear,
          nice: true,
          grid: true,
          axis: {
            ticks: {
              count: Y_TICK_COUNT,
              format: (value) => `${Number(value).toFixed(1)}σ`,
            },
          },
        },
        tooltip,
      }),
    [data],
  )

  if (data.length < MIN_POINTS_TO_RENDER) {
    return <RhythmCalibratingNotice />
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-(--line) bg-(--surface-muted) p-3">
      <Chart
        definition={definition}
        height={CHART_HEIGHT}
        initialWidth={CHART_INITIAL_WIDTH}
        ariaLabel="Recent learning rhythm compared with personal baseline"
      />
    </div>
  )
}

function RhythmCalibratingNotice() {
  return (
    <div className="flex min-h-52 items-center justify-center rounded-2xl border border-(--line) bg-(--surface-muted) px-6">
      <div className="max-w-sm text-center">
        <p className="text-sm font-medium">Your rhythm is still calibrating</p>

        <p className="mt-1.5 text-xs leading-5 text-(--ink-faint)">
          Complete a few more sensed review observations and Luminoesis will begin showing your personal
          learning rhythm.
        </p>
      </div>
    </div>
  )
}