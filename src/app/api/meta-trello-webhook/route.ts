import { NextRequest, NextResponse } from "next/server";

// ==== Config (via variáveis de ambiente na Vercel) ====
const VERIFY_TOKEN = process.env.META_TRELLO_VERIFY_TOKEN!;
const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN!;
const TRELLO_KEY = process.env.TRELLO_KEY!;
const TRELLO_TOKEN = process.env.TRELLO_TOKEN!;
const TRELLO_LIST_ID = process.env.TRELLO_LIST_ID!; // 6a723e6c4e671cc5ca104614

// ==== GET: validação do webhook pelo Meta ====
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

// ==== POST: recebe notificação de novo lead ====
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.object !== "page") {
      return NextResponse.json({ status: "ignored" });
    }

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== "leadgen") continue;

        const leadgenId = change.value?.leadgen_id;
        if (!leadgenId) continue;

        // 1. Busca os dados completos do lead na Graph API
        const leadRes = await fetch(
          `https://graph.facebook.com/v21.0/${leadgenId}?access_token=${PAGE_ACCESS_TOKEN}`
        );
        const leadData = await leadRes.json();

        if (leadData.error) {
          console.error("Erro ao buscar lead:", leadData.error);
          continue;
        }

        // 2. Monta nome/telefone a partir dos campos do formulário
        const fields: Record<string, string> = {};
        for (const f of leadData.field_data ?? []) {
          fields[f.name] = f.values?.[0] ?? "";
        }

        const nome =
          fields["full_name"] || fields["nome"] || fields["first_name"] || "Lead sem nome";
        const telefone = fields["phone_number"] || fields["telefone"] || "Sem telefone";
        const email = fields["email"] || "";

        const cardName = `${nome} - ${telefone}`;
        const cardDesc = [
          `**Origem:** Meta Ads (Sítios Campo Belo II)`,
          `**Nome:** ${nome}`,
          `**Telefone:** ${telefone}`,
          email ? `**Email:** ${email}` : null,
          `**Lead ID:** ${leadgenId}`,
          `**Recebido em:** ${new Date().toLocaleString("pt-BR")}`,
        ]
          .filter(Boolean)
          .join("\n");

        // 3. Cria o card no Trello, na lista "Lead Novo"
        const trelloUrl = new URL("https://api.trello.com/1/cards");
        trelloUrl.searchParams.set("key", TRELLO_KEY);
        trelloUrl.searchParams.set("token", TRELLO_TOKEN);
        trelloUrl.searchParams.set("idList", TRELLO_LIST_ID);
        trelloUrl.searchParams.set("name", cardName);
        trelloUrl.searchParams.set("desc", cardDesc);

        const trelloRes = await fetch(trelloUrl.toString(), { method: "POST" });

        if (!trelloRes.ok) {
          console.error("Erro ao criar card no Trello:", await trelloRes.text());
        }
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("Erro no webhook Meta -> Trello:", err);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
