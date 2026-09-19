"use client"

import Image from "next/image"
import { FormEvent, useMemo, useState } from "react"
import {
  ChartHistogramIcon,
  Clock01Icon,
  Location01Icon,
  Search01Icon,
  WeightScale01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  type ChartData,
  type ChartDataset,
  type ChartOptions,
} from "chart.js"
import { Bar, Line } from "react-chartjs-2"

import sisfreteLogo from "@/lib/sisfrete-branco.png"

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineController,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
)

ChartJS.defaults.font.size = 12
ChartJS.defaults.color = "#55626e"

type QuotePoint = {
  carrier: string
  freight: number
  deadline: number
  weight: number
  postalCode: string
}

type QuotationResponse = {
  clientId: string
  index: string
  documents: number
  points: QuotePoint[]
}

type Metric = "median" | "mean"
type DeadlineWindow = 7 | 15
type DatasetWithCounts = { counts: number[] }

const carrierColors = ["#009161", "#395b50", "#47ad88", "#006b49", "#7ca99a"]

const weightBuckets = [
  { label: "Até 5 kg", includes: (weight: number) => weight <= 5 },
  {
    label: "5–10 kg",
    includes: (weight: number) => weight > 5 && weight <= 10,
  },
  {
    label: "10–20 kg",
    includes: (weight: number) => weight > 10 && weight <= 20,
  },
  {
    label: "20–50 kg",
    includes: (weight: number) => weight > 20 && weight <= 50,
  },
  { label: "Acima de 50 kg", includes: (weight: number) => weight > 50 },
]

const commonLegend = {
  position: "bottom" as const,
  align: "start" as const,
  labels: {
    usePointStyle: true,
    pointStyle: "circle" as const,
    boxWidth: 7,
    boxHeight: 7,
    padding: 22,
    font: { size: 12, weight: 500 as const },
  },
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })
}

function tooltipCallbacks() {
  return {
    label: (context: {
      dataset: ChartDataset<"line" | "bar"> & Partial<DatasetWithCounts>
      parsed: { y: number | null }
    }) =>
      `${context.dataset.label}: ${formatCurrency(Number(context.parsed.y ?? 0))}`,
    afterLabel: (context: {
      dataset: ChartDataset<"line" | "bar"> & Partial<DatasetWithCounts>
      dataIndex: number
    }) => {
      const count = context.dataset.counts?.[context.dataIndex] ?? 0
      return `${count.toLocaleString("pt-BR")} ${count === 1 ? "cotação" : "cotações"}`
    },
  }
}

const lineOptions: ChartOptions<"line"> = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 240 },
  interaction: { mode: "index", intersect: false },
  plugins: {
    legend: commonLegend,
    tooltip: { callbacks: tooltipCallbacks() },
  },
  scales: {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: { color: "#65727e", font: { size: 11 } },
    },
    y: {
      beginAtZero: true,
      grid: { color: "#edf0f2" },
      border: { display: false },
      ticks: {
        color: "#65727e",
        font: { size: 11 },
        callback: (value) => `R$ ${value}`,
      },
    },
  },
}

const barOptions: ChartOptions<"bar"> = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 240 },
  interaction: { mode: "index", intersect: false },
  plugins: {
    legend: commonLegend,
    tooltip: { callbacks: tooltipCallbacks() },
  },
  scales: {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: { color: "#65727e", maxRotation: 0, font: { size: 11 } },
    },
    y: {
      beginAtZero: true,
      grid: { color: "#edf0f2" },
      border: { display: false },
      ticks: {
        color: "#65727e",
        font: { size: 11 },
        callback: (value) => `R$ ${value}`,
      },
    },
  },
}

function groupByCarrier(points: QuotePoint[]) {
  return points.reduce<Record<string, QuotePoint[]>>((groups, point) => {
    groups[point.carrier] ??= []
    groups[point.carrier].push(point)
    return groups
  }, {})
}

function quantile(sortedValues: number[], position: number) {
  const index = (sortedValues.length - 1) * position
  const lower = Math.floor(index)
  const fraction = index - lower
  const next = sortedValues[lower + 1]
  return next === undefined
    ? sortedValues[lower]
    : sortedValues[lower] + fraction * (next - sortedValues[lower])
}

function removeOutliers(points: QuotePoint[]) {
  let excluded = 0
  const filtered = Object.values(groupByCarrier(points)).flatMap(
    (carrierPoints) => {
      if (carrierPoints.length < 4) return carrierPoints

      const prices = carrierPoints
        .map((point) => point.freight)
        .sort((a, b) => a - b)
      const firstQuartile = quantile(prices, 0.25)
      const thirdQuartile = quantile(prices, 0.75)
      const interval = thirdQuartile - firstQuartile
      const minimum = firstQuartile - interval * 1.5
      const maximum = thirdQuartile + interval * 1.5

      return carrierPoints.filter((point) => {
        const keep = point.freight >= minimum && point.freight <= maximum
        if (!keep) excluded += 1
        return keep
      })
    }
  )

  return { filtered, excluded }
}

function aggregate(values: number[], metric: Metric) {
  if (!values.length) return null
  if (metric === "mean") {
    return values.reduce((total, value) => total + value, 0) / values.length
  }

  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2
}

function topCarriers(points: QuotePoint[], limit = 5) {
  return Object.entries(groupByCarrier(points))
    .sort(([, first], [, second]) => second.length - first.length)
    .slice(0, limit)
    .map(([carrier]) => carrier)
}

function createLineData(
  points: QuotePoint[],
  carriers: string[],
  labels: string[],
  categoryIndex: (point: QuotePoint) => number,
  metric: Metric
): ChartData<"line"> {
  const datasets = carriers.map((carrier, colorIndex) => {
    const carrierPoints = points.filter((point) => point.carrier === carrier)
    const counts = labels.map(
      (_, index) =>
        carrierPoints.filter((point) => categoryIndex(point) === index).length
    )
    const data = labels.map((_, index) =>
      aggregate(
        carrierPoints
          .filter((point) => categoryIndex(point) === index)
          .map((point) => point.freight),
        metric
      )
    )
    const color = carrierColors[colorIndex % carrierColors.length]

    return {
      label: carrier,
      data,
      counts,
      borderColor: color,
      backgroundColor: color,
      borderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
      tension: 0.25,
      spanGaps: false,
    } satisfies ChartDataset<"line"> & DatasetWithCounts
  })

  return { labels, datasets }
}

function createPostalCodeData(
  points: QuotePoint[],
  carriers: string[],
  metric: Metric
): ChartData<"bar"> {
  const prefixes = Object.entries(
    points.reduce<Record<string, number>>((counts, point) => {
      const prefix = point.postalCode.slice(0, 3)
      counts[prefix] = (counts[prefix] ?? 0) + 1
      return counts
    }, {})
  )
    .sort(([, first], [, second]) => second - first)
    .slice(0, 10)
    .map(([prefix]) => prefix)

  const datasets = carriers.map((carrier, colorIndex) => {
    const carrierPoints = points.filter((point) => point.carrier === carrier)
    const counts = prefixes.map(
      (prefix) =>
        carrierPoints.filter((point) => point.postalCode.startsWith(prefix))
          .length
    )
    const data = prefixes.map((prefix) =>
      aggregate(
        carrierPoints
          .filter((point) => point.postalCode.startsWith(prefix))
          .map((point) => point.freight),
        metric
      )
    )

    return {
      label: carrier,
      data,
      counts,
      backgroundColor: carrierColors[colorIndex % carrierColors.length],
      borderRadius: 3,
    } satisfies ChartDataset<"bar"> & DatasetWithCounts
  })

  return {
    labels: prefixes.map((prefix) => `${prefix}-*****`),
    datasets,
  }
}

function ChartCard({
  title,
  description,
  icon,
  children,
}: {
  title: string
  description: string
  icon: typeof ChartHistogramIcon
  children: React.ReactNode
}) {
  return (
    <article className="chart-card">
      <div className="chart-card-header">
        <span className="chart-card-icon" aria-hidden="true">
          <HugeiconsIcon icon={icon} size={22} strokeWidth={1.8} />
        </span>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      <div className="chart-container">{children}</div>
    </article>
  )
}

export default function Page() {
  const [clientId, setClientId] = useState("")
  const [result, setResult] = useState<QuotationResponse | null>(null)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [metric, setMetric] = useState<Metric>("median")
  const [deadlineWindow, setDeadlineWindow] = useState<DeadlineWindow>(7)
  const [selectedCarriers, setSelectedCarriers] = useState<string[]>([])

  const outlierResult = useMemo(
    () => removeOutliers(result?.points ?? []),
    [result]
  )
  const availableCarriers = useMemo(
    () =>
      Object.keys(groupByCarrier(outlierResult.filtered)).sort(
        (first, second) => first.localeCompare(second, "pt-BR")
      ),
    [outlierResult.filtered]
  )
  const visiblePoints = useMemo(
    () =>
      outlierResult.filtered.filter((point) =>
        selectedCarriers.includes(point.carrier)
      ),
    [outlierResult.filtered, selectedCarriers]
  )

  const deadlineLabels = useMemo(() => {
    const maximum = Math.max(
      deadlineWindow,
      ...visiblePoints.map((point) => point.deadline)
    )
    const quantity = Math.ceil(maximum / deadlineWindow)
    return Array.from({ length: quantity }, (_, index) => {
      const start = index * deadlineWindow + 1
      return `${start}–${start + deadlineWindow - 1} dias`
    })
  }, [deadlineWindow, visiblePoints])

  const deadlineData = useMemo(
    () =>
      createLineData(
        visiblePoints,
        selectedCarriers,
        deadlineLabels,
        (point) =>
          Math.max(0, Math.floor((point.deadline - 1) / deadlineWindow)),
        metric
      ),
    [visiblePoints, selectedCarriers, deadlineLabels, deadlineWindow, metric]
  )
  const weightData = useMemo(
    () =>
      createLineData(
        visiblePoints,
        selectedCarriers,
        weightBuckets.map((bucket) => bucket.label),
        (point) =>
          weightBuckets.findIndex((bucket) => bucket.includes(point.weight)),
        metric
      ),
    [visiblePoints, selectedCarriers, metric]
  )
  const postalCodeData = useMemo(
    () => createPostalCodeData(visiblePoints, selectedCarriers, metric),
    [visiblePoints, selectedCarriers, metric]
  )

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedId = clientId.trim()

    if (!/^\d+$/.test(normalizedId)) {
      setError("Informe um ID de cliente numérico válido.")
      return
    }

    setError("")
    setIsLoading(true)

    try {
      const response = await fetch(
        `/api/quotations?clientId=${encodeURIComponent(normalizedId)}`,
        { cache: "no-store" }
      )
      const data = (await response.json()) as
        QuotationResponse | { message?: string }

      if (!response.ok) {
        throw new Error(
          "message" in data && data.message
            ? data.message
            : "Não foi possível buscar os dados."
        )
      }

      const quotationResult = data as QuotationResponse
      setResult(quotationResult)
      setSelectedCarriers(topCarriers(quotationResult.points))
    } catch (requestError) {
      setResult(null)
      setSelectedCarriers([])
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível buscar os dados."
      )
    } finally {
      setIsLoading(false)
    }
  }

  function toggleCarrier(carrier: string) {
    setSelectedCarriers((current) => {
      if (current.includes(carrier)) {
        return current.filter((item) => item !== carrier)
      }
      if (current.length >= 5) return current
      return [...current, carrier]
    })
  }

  const hasData = Boolean(result?.points.length)
  const metricLabel = metric === "median" ? "Mediana" : "Média"

  return (
    <main className="dashboard-page">
      <header className="app-header">
        <Image
          src={sisfreteLogo}
          alt="Sisfrete"
          className="brand-logo"
          priority
        />
        <span>Dashboard de cotações</span>
      </header>

      <div className="dashboard-container">
        <section className="dashboard-heading">
          <div>
            <span className="eyebrow">Análise de fretes</span>
            <h1>Dashboard</h1>
            <p>
              Informe o cliente para comparar frete, prazo, peso e CEP por
              transportadora.
            </p>
          </div>

          <form className="client-form" onSubmit={handleSubmit}>
            <label htmlFor="client-id">ID do cliente</label>
            <div className="client-form-row">
              <input
                id="client-id"
                name="clientId"
                inputMode="numeric"
                value={clientId}
                onChange={(event) => setClientId(event.target.value)}
                placeholder="Ex.: 1483"
                aria-describedby={error ? "client-id-error" : undefined}
                aria-invalid={Boolean(error)}
                disabled={isLoading}
              />
              <button type="submit" disabled={isLoading}>
                {!isLoading && (
                  <HugeiconsIcon
                    icon={Search01Icon}
                    size={18}
                    strokeWidth={2}
                  />
                )}
                {isLoading ? "Buscando..." : "Buscar dados"}
              </button>
            </div>
            {error && (
              <span id="client-id-error" className="form-error" role="alert">
                {error}
              </span>
            )}
          </form>
        </section>

        {result && (
          <div className="context-bar">
            <div>
              <span>Cliente</span>
              <strong>{result.clientId}</strong>
            </div>
            <div>
              <span>Cotações válidas</span>
              <strong>{result.points.length.toLocaleString("pt-BR")}</strong>
            </div>
            <div>
              <span>Outliers separados</span>
              <strong>{outlierResult.excluded.toLocaleString("pt-BR")}</strong>
            </div>
            <div className="index-context">
              <span>Índice consultado</span>
              <strong>{result.index}</strong>
            </div>
          </div>
        )}

        {isLoading && (
          <section className="dashboard-state" aria-live="polite">
            <span className="loading-indicator" />
            <strong>Buscando cotações do cliente</strong>
            <p>A consulta pode levar alguns segundos.</p>
          </section>
        )}

        {!isLoading && !result && (
          <section className="dashboard-state">
            <HugeiconsIcon
              icon={ChartHistogramIcon}
              size={32}
              strokeWidth={1.5}
            />
            <strong>Informe um cliente para começar</strong>
            <p>
              Os três gráficos serão montados com os dados retornados pela API.
            </p>
          </section>
        )}

        {!isLoading && result && !hasData && (
          <section className="dashboard-state">
            <strong>Nenhuma cotação válida encontrada</strong>
            <p>
              O índice existe, mas não retornou dados suficientes para os
              gráficos.
            </p>
          </section>
        )}

        {!isLoading && hasData && (
          <>
            <section
              className="analysis-controls"
              aria-label="Controles dos gráficos"
            >
              <div className="control-group">
                <span>Métrica</span>
                <div className="segmented-control">
                  <button
                    type="button"
                    className={metric === "median" ? "is-active" : undefined}
                    aria-pressed={metric === "median"}
                    onClick={() => setMetric("median")}
                  >
                    Mediana
                  </button>
                  <button
                    type="button"
                    className={metric === "mean" ? "is-active" : undefined}
                    aria-pressed={metric === "mean"}
                    onClick={() => setMetric("mean")}
                  >
                    Média
                  </button>
                </div>
              </div>

              <div className="control-group">
                <span>Janela de prazo</span>
                <div className="segmented-control">
                  {[7, 15].map((days) => (
                    <button
                      type="button"
                      key={days}
                      className={
                        deadlineWindow === days ? "is-active" : undefined
                      }
                      aria-pressed={deadlineWindow === days}
                      onClick={() => setDeadlineWindow(days as DeadlineWindow)}
                    >
                      {days} dias
                    </button>
                  ))}
                </div>
              </div>

              <details className="carrier-filter">
                <summary>
                  Transportadoras
                  <strong>{selectedCarriers.length}/5</strong>
                </summary>
                <div className="carrier-options">
                  {availableCarriers.map((carrier) => {
                    const checked = selectedCarriers.includes(carrier)
                    return (
                      <label key={carrier}>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!checked && selectedCarriers.length >= 5}
                          onChange={() => toggleCarrier(carrier)}
                        />
                        {carrier}
                      </label>
                    )
                  })}
                </div>
              </details>

              <p className="aggregation-note">
                Valores agregados por {metricLabel.toLowerCase()}; passe o
                cursor para ver a amostra.
              </p>
            </section>

            {selectedCarriers.length === 0 ? (
              <section className="dashboard-state compact-state">
                <strong>Selecione pelo menos uma transportadora</strong>
              </section>
            ) : (
              <section className="charts-grid" aria-label="Gráficos de frete">
                <ChartCard
                  icon={Clock01Icon}
                  title="Frete × prazo × transportadora"
                  description={`${metricLabel} do frete em janelas fixas de ${deadlineWindow} dias.`}
                >
                  <Line options={lineOptions} data={deadlineData} />
                </ChartCard>

                <ChartCard
                  icon={WeightScale01Icon}
                  title="Frete × peso × transportadora"
                  description={`${metricLabel} do frete por faixa de peso real da carga.`}
                >
                  <Line options={lineOptions} data={weightData} />
                </ChartCard>

                <ChartCard
                  icon={Location01Icon}
                  title="Frete × CEP × transportadora"
                  description={`${metricLabel} do frete nas 10 faixas de CEP com maior volume.`}
                >
                  <Bar options={barOptions} data={postalCodeData} />
                </ChartCard>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  )
}
