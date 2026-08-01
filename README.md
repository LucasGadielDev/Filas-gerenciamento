# Treino RenderLab

Sistema full-stack para cadastro e disparo assíncrono de campanhas de e-mail.

## Executar

```bash
npm install
npm run db:migrate
npm run dev
```

A API inicia em `http://localhost:3001`.

## Front-end

Em outro terminal:

```bash
cd frontend
npm install
npm run dev
```

A interface inicia em `http://localhost:3000`, consome a API local e atualiza a
lista de campanhas a cada dois segundos. Para alterar a URL da API, copie
`frontend/.env.local.example` para `frontend/.env.local`.

## API

### Criar campanha

`POST /api/campaigns`

```json
{
  "subject": "Novidades da semana",
  "message": "Confira as novidades.",
  "recipientEmail": "cliente@example.com"
}
```

Retorna `202 Accepted` com a campanha em `PENDING`. Solicitações iguais para um job
em `PENDING` ou `PROCESSING` retornam `409 Conflict`.

### Listar campanhas

`GET /api/campaigns`

## Fila local

O worker em memória processa uma campanha por vez, marca-a como `PROCESSING`,
aguarda cinco segundos e finaliza como `SENT`. O sufixo
`@invalid.test` simula uma falha e resulta em `FAILED`.

Em caso de reinicialização, campanhas que ainda estavam em `PENDING` são
recolocadas na fila ao iniciar a API.
