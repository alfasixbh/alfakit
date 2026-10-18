<script lang="ts">
  let { data, color }: { data: number[]; color: string } = $props()

  const width = 200
  const height = 40
  const path = $derived.by(() => {
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1
    const points = data.map(
      (value, index) =>
        [
          (index / (data.length - 1)) * width,
          height - ((value - min) / range) * (height - 4) - 2,
        ] as const,
    )

    return points
      .map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
      .join(' ')
  })
  const area = $derived(`${path} L${width},${height} L0,${height} Z`)
</script>

<svg
  viewBox="0 0 {width} {height}"
  class="mt-1 h-10 w-full"
  preserveAspectRatio="none"
  aria-hidden="true"
  data-slot="stat-chart"
>
  <path
    d={area}
    fill={color}
    data-slot="stat-chart-area"
    style="opacity: var(--stat-chart-fill-opacity, 0.12)"
  />
  <path
    d={path}
    fill="none"
    stroke={color}
    stroke-linejoin="round"
    stroke-linecap="round"
    data-slot="stat-chart-line"
    style="stroke-width: var(--stat-chart-stroke-width, 2)"
  />
</svg>
