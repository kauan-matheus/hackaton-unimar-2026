"use client"

import { FormEvent, useState } from "react"
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from "chart.js"
import { Bar, Scatter } from "react-chartjs-2"

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
)

const carrierColors = {
  Jadlog: "#245ec7",
  Correios: "#6f7d8c",
  "Total Express": "#238064",
}

const deadlineData: ChartData<"scatter"> = {
  datasets: [
    {
      label: "Jadlog",
      data: [
        { x: 2, y: 46.8 },
        { x: 3, y: 38.4 },
        { x: 5, y: 31.2 },
      ],
      backgroundColor: carrierColors.Jadlog,
    },
    {
      label: "Correios",
      data: [
        { x: 3, y: 52.1 },
        { x: 4, y: 42.1 },
        { x: 6, y: 34.5 },
      ],
      backgroundColor: carrierColors.Correios,
    },
    {
      label: "Total Express",
      data: [
        { x: 2, y: 49.2 },
        { x: 4, y: 36.8 },
        { x: 5, y: 30.4 },
      ],
      backgroundColor: carrierColors["Total Express"],
    },
  ],
}

const weightData: ChartData<"scatter"> = {
  datasets: [
    {
      label: "Jadlog",
      data: [
        { x: 0.5, y: 22.4 },
        { x: 2, y: 31.8 },
        { x: 5, y: 47.2 },
        { x: 10, y: 72.5 },
      ],
      backgroundColor: carrierColors.Jadlog,
    },
    {
      label: "Correios",
      data: [
        { x: 0.5, y: 24.9 },
        { x: 2, y: 35.4 },
        { x: 5, y: 51.8 },
        { x: 10, y: 79.2 },
      ],
      backgroundColor: carrierColors.Correios,
    },
    {
      label: "Total Express",
      data: [
        { x: 0.5, y: 21.8 },
        { x: 2, y: 29.6 },
        { x: 5, y: 44.1 },
        { x: 10, y: 68.7 },
      ],
      backgroundColor: carrierColors["Total Express"],
    },
  ],
}

const postalCodeData: ChartData<"bar"> = {
  labels: ["01000", "13000", "20000", "30100", "80000"],
  datasets: [
    {
      label: "Jadlog",
      data: [28.4, 32.1, 39.8, 44.2, 36.5],
      backgroundColor: carrierColors.Jadlog,
      borderRadius: 3,
    },
    {
      label: "Correios",
      data: [31.2, 35.8, 42.4, 48.1, 40.3],
      backgroundColor: carrierColors.Correios,
      borderRadius: 3,
    },
    {
      label: "Total Express",
      data: [26.9, 30.4, 37.2, 41.8, 34.1],
      backgroundColor: carrierColors["Total Express"],
      borderRadius: 3,
    },
  ],
}

const sharedOptions: ChartOptions<"scatter"> = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 240 },
  plugins: {
    legend: {
      position: "bottom",
      align: "start",
      labels: {
        usePointStyle: true,
        pointStyle: "circle",
        boxWidth: 7,
        boxHeight: 7,
        padding: 18,
      },
    },
    tooltip: {
      callbacks: {
        label: (context) =>
          `${context.dataset.label}: R$ ${Number(context.parsed.y ?? 0)
            .toFixed(2)
            .replace(".", ",")}`,
      },
    },
  },
  scales: {
    x: {
      grid: { color: "#edf0f2" },
      border: { display: false },
      ticks: { color: "#77838f" },
    },
    y: {
      beginAtZero: true,
      grid: { color: "#edf0f2" },
      border: { display: false },
      ticks: { color: "#77838f", callback: (value) => `R$ ${value}` },
    },
  },
}

const postalCodeOptions: ChartOptions<"bar"> = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 240 },
  plugins: {
    legend: {
      position: "bottom",
      align: "start",
      labels: {
        usePointStyle: true,
        pointStyle: "circle",
        boxWidth: 7,
        boxHeight: 7,
        padding: 18,
      },
    },
    tooltip: {
      callbacks: {
        label: (context) =>
          `${context.dataset.label}: R$ ${Number(context.parsed.y ?? 0)
            .toFixed(2)
            .replace(".", ",")}`,
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: { color: "#77838f" },
    },
    y: {
      beginAtZero: true,
      grid: { color: "#edf0f2" },
      border: { display: false },
      ticks: { color: "#77838f", callback: (value) => `R$ ${value}` },
    },
  },
}

function ChartCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <article className="chart-card">
      <div className="chart-card-header">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <span>Demonstrativo</span>
      </div>
      <div className="chart-container">{children}</div>
    </article>
  )
}

export default function Page() {
  const [clientId, setClientId] = useState("")
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [error, setError] = useState("")

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedId = clientId.trim()

    if (!normalizedId) {
      setError("Informe o ID do cliente.")
      return
    }

    setError("")
    setSelectedClientId(normalizedId)
  }

  return (
    <main className="dashboard-page">
      <header className="app-header">
        <div className="brand">
          <span className="brand-symbol" aria-hidden="true">
            S
          </span>
          <div>
            <strong>sisfrete</strong>
            <span>Dashboard</span>
          </div>
        </div>
      </header>

      <div className="dashboard-container">
        <section className="dashboard-heading">
          <div>
            <span className="eyebrow">Análise de fretes</span>
            <h1>Dashboard</h1>
            <p>
              Informe o cliente para visualizar os comparativos de frete por
              transportadora.
            </p>
          </div>

          <form className="client-form" onSubmit={handleSubmit}>
            <label htmlFor="client-id">ID do cliente</label>
            <div className="client-form-row">
              <input
                id="client-id"
                name="clientId"
                value={clientId}
                onChange={(event) => setClientId(event.target.value)}
                placeholder="Ex.: 1024"
                aria-describedby={error ? "client-id-error" : undefined}
                aria-invalid={Boolean(error)}
              />
              <button type="submit">Buscar dados</button>
            </div>
            {error && (
              <span id="client-id-error" className="form-error">
                {error}
              </span>
            )}
          </form>
        </section>

        <div className="context-bar">
          <div>
            <span>Cliente selecionado</span>
            <strong>{selectedClientId ?? "Nenhum cliente informado"}</strong>
          </div>
          <p>Os dados exibidos são demonstrativos até a integração da API.</p>
        </div>

        <section className="charts-grid" aria-label="Gráficos de frete">
          <ChartCard
            title="Frete × prazo × transportadora"
            description="Relação entre valor cotado e prazo de entrega, em dias."
          >
            <Scatter
              options={{
                ...sharedOptions,
                scales: {
                  ...sharedOptions.scales,
                  x: {
                    ...sharedOptions.scales?.x,
                    title: { display: true, text: "Prazo (dias)" },
                  },
                },
              }}
              data={deadlineData}
            />
          </ChartCard>

          <ChartCard
            title="Frete × peso × transportadora"
            description="Variação do valor do frete de acordo com o peso da carga."
          >
            <Scatter
              options={{
                ...sharedOptions,
                scales: {
                  ...sharedOptions.scales,
                  x: {
                    ...sharedOptions.scales?.x,
                    title: { display: true, text: "Peso (kg)" },
                  },
                },
              }}
              data={weightData}
            />
          </ChartCard>

          <ChartCard
            title="Frete × CEP × transportadora"
            description="Comparação do valor médio cotado por faixa inicial de CEP."
          >
            <Bar options={postalCodeOptions} data={postalCodeData} />
          </ChartCard>
        </section>
      </div>
    </main>
  )
}
