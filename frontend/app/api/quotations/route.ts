import { NextRequest } from "next/server"

type OpenSearchQuote = {
  shipping_company?: string
  price?: number
  promise?: number
}

type QuotationPayload = {
  peso?: number
  cep?: string | number
  uf?: string
  request_quotation?: OpenSearchQuote[] | null
}

type OpenSearchHit = {
  _id?: string
  _source?: {
    id?: string
    nf?: QuotationPayload
  }
}

type OpenSearchResponse = {
  hits?: {
    total?: { value?: number }
    hits?: OpenSearchHit[]
  }
}

function currentIndexSuffix() {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date())

  const year = parts.find((part) => part.type === "year")?.value
  const month = parts.find((part) => part.type === "month")?.value

  return `${year}.${month}`
}

export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get("clientId")?.trim()

  if (!clientId || !/^\d+$/.test(clientId)) {
    return Response.json(
      { message: "Informe um ID de cliente numérico válido." },
      { status: 400 }
    )
  }

  const authorization = process.env.SISFRETE_OPENSEARCH_AUTH

  if (!authorization) {
    return Response.json(
      { message: "A credencial da Sisfrete não foi configurada no servidor." },
      { status: 500 }
    )
  }

  const index = `quotations-${clientId}-${currentIndexSuffix()}`
  const searchParams = new URLSearchParams({
    size: "500",
    sort: "@timestamp:desc",
    _source: "nf,id",
  })
  const endpoint = `https://api.opensearch.sisfrete.com.br/${index}/_search?${searchParams}`

  try {
    const response = await fetch(endpoint, {
      headers: {
        Authorization: `Basic ${authorization}`,
      },
      cache: "no-store",
    })

    if (!response.ok) {
      const status = response.status === 404 ? 404 : 502
      return Response.json(
        {
          message:
            response.status === 404
              ? "Nenhum índice foi encontrado para este cliente no mês atual."
              : "Não foi possível consultar os dados da Sisfrete.",
        },
        { status }
      )
    }

    const data = (await response.json()) as OpenSearchResponse
    const points = (data.hits?.hits ?? []).flatMap((hit) => {
      const payload = hit._source?.nf
      if (!payload?.request_quotation) return []

      const quotationId = hit._source?.id ?? hit._id
      const weight = Number(payload.peso)
      const postalCode = String(payload.cep ?? "").padStart(8, "0")
      const state = payload.uf?.trim().toUpperCase() ?? ""

      return payload.request_quotation.flatMap((quotation) => {
        const carrier = quotation.shipping_company?.trim()
        const freight = Number(quotation.price)
        const deadline = Number(quotation.promise)

        if (
          !carrier ||
          !Number.isFinite(freight) ||
          !Number.isFinite(deadline) ||
          !Number.isFinite(weight) ||
          !/^\d{8}$/.test(postalCode) ||
          !/^[A-Z]{2}$/.test(state) ||
          !quotationId
        ) {
          return []
        }

        return [
          {
            quotationId,
            carrier,
            freight,
            deadline,
            weight,
            postalCode,
            state,
          },
        ]
      })
    })

    return Response.json({
      clientId,
      index,
      documents: data.hits?.total?.value ?? 0,
      points,
    })
  } catch {
    return Response.json(
      { message: "A API da Sisfrete está indisponível no momento." },
      { status: 502 }
    )
  }
}
