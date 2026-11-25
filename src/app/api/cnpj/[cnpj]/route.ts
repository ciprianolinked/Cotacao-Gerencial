import { NextResponse } from "next/server";

const BRASILAPI_URL = (digits: string) =>
  `https://brasilapi.com.br/api/cnpj/v1/${digits}`;
const RECEITAWS_URL = (digits: string) =>
  `https://receitaws.com.br/v1/cnpj/${digits}`;

const SMALL_WORDS = new Set(["de", "da", "do", "das", "dos", "e"]);

function titleCaseWord(word: string): string {
  const lower = word.toLowerCase();
  if (SMALL_WORDS.has(lower)) return lower;
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function titleCaseCity(mun: string | undefined | null): string {
  if (!mun?.trim()) return "";
  return mun
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map(titleCaseWord)
    .join(" ");
}

export function formatCnpj(digits: string): string {
  const m = digits.match(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/);
  if (!m) return digits;
  return `${m[1]}.${m[2]}.${m[3]}/${m[4]}-${m[5]}`;
}

function formatPhone(raw: string | undefined | null): string {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  return raw?.trim() || "";
}

interface NormalizedCnpj {
  cnpj: string;
  digits: string;
  name: string;
  legalName: string;
  tradeName: string;
  city: string;
  uf: string;
  email: string;
  phone: string;
  manager: string;
  status: string;
  source: "brasilapi" | "receitaws";
}

interface BrasilApiResponse {
  cnpj?: string;
  razao_social?: string;
  nome_fantasia?: string;
  municipio?: string;
  uf?: string;
  email?: string;
  ddd_telefone_1?: string;
  ddd_telefone_2?: string;
  descricao_situacao_cadastral?: string;
  qsa?: Array<{ nome_socio?: string; qualificacao_socio?: string }>;
  message?: string;
}

interface ReceitaWsResponse {
  cnpj?: string;
  nome?: string;
  fantasia?: string;
  municipio?: string;
  uf?: string;
  email?: string;
  telefone?: string;
  situacao?: string;
  qsa?: Array<{ nome?: string; qual?: string }>;
  message?: string;
  status?: string;
}

async function fetchFromBrasilApi(
  digits: string
): Promise<NormalizedCnpj | null> {
  const res = await fetch(BRASILAPI_URL(digits), {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(12_000),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as BrasilApiResponse;
  if (!data || (!data.razao_social && !data.nome_fantasia)) return null;

  const legalName = (data.razao_social ?? "").trim();
  const tradeName = (data.nome_fantasia ?? "").trim();
  const name = tradeName || legalName;
  const uf = (data.uf ?? "").trim().toUpperCase();
  const city = titleCaseCity(data.municipio);
  const qsa = data.qsa ?? [];
  const syndic = qsa.find((s) =>
    /SINDIC/i.test(s.qualificacao_socio ?? "")
  );

  return {
    cnpj: formatCnpj(digits),
    digits,
    name,
    legalName,
    tradeName,
    city: city && uf ? `${city} / ${uf}` : city || uf,
    uf,
    email: (data.email ?? "").trim().toLowerCase(),
    phone: formatPhone(data.ddd_telefone_1 || data.ddd_telefone_2),
    manager: (syndic?.nome_socio ?? "").trim(),
    status: (data.descricao_situacao_cadastral ?? "").trim(),
    source: "brasilapi",
  };
}

async function fetchFromReceitaWs(
  digits: string
): Promise<NormalizedCnpj | null> {
  const res = await fetch(RECEITAWS_URL(digits), {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(12_000),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as ReceitaWsResponse;
  if (data.status === "ERROR" || !data.nome) return null;

  const legalName = (data.nome ?? "").trim();
  const tradeName = (data.fantasia ?? "").trim();
  const name = tradeName || legalName;
  const uf = (data.uf ?? "").trim().toUpperCase();
  const city = titleCaseCity(data.municipio);
  const qsa = data.qsa ?? [];
  const syndic = qsa.find((s) => /SINDIC/i.test(s.qual ?? ""));

  return {
    cnpj: formatCnpj(digits),
    digits,
    name,
    legalName,
    tradeName,
    city: city && uf ? `${city} / ${uf}` : city || uf,
    uf,
    email: (data.email ?? "").trim().toLowerCase(),
    phone: formatPhone(data.telefone?.split("/")[0] ?? data.telefone),
    manager: (syndic?.nome ?? "").trim(),
    status: (data.situacao ?? "").trim(),
    source: "receitaws",
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ cnpj: string }> }
) {
  try {
    const { cnpj } = await context.params;
    const digits = (cnpj ?? "").replace(/\D/g, "");

    if (digits.length !== 14) {
      return NextResponse.json(
        { error: "CNPJ inválido. Informe os 14 dígitos (ex.: 00.000.000/0001-91)." },
        { status: 400 }
      );
    }

    let result: NormalizedCnpj | null = null;
    try {
      result = await fetchFromBrasilApi(digits);
    } catch (err) {
      console.warn("BrasilAPI falhou, tentando ReceitaWS:", err);
    }
    if (!result) {
      try {
        result = await fetchFromReceitaWs(digits);
      } catch (err) {
        console.warn("ReceitaWS falhou:", err);
      }
    }

    if (!result) {
      return NextResponse.json(
        {
          error:
            "Não foi possível localizar este CNPJ nas bases públicas da Receita Federal. Confira os dígitos ou preencha manualmente.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ company: result });
  } catch (error) {
    console.error("GET /api/cnpj/[cnpj] error:", error);
    return NextResponse.json(
      {
        error:
          "Falha ao consultar o CNPJ. Tente novamente em instantes ou preencha manualmente.",
      },
      { status: 502 }
    );
  }
}
