import "dotenv/config";
import crypto from "node:crypto";
import cors from "cors";
import express from "express";
import { CampaignStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "./lib/prisma";
import { enqueueCampaign, resumePendingCampaigns } from "./queue/campaign.queue";

const app = express();
const port = Number(process.env.PORT ?? 3001);

const createCampaignSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(10_000),
  recipientEmail: z.string().trim().email().max(320),
});

function createIdempotencyKey(input: z.infer<typeof createCampaignSchema>) {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        subject: input.subject,
        message: input.message,
        recipientEmail: input.recipientEmail.toLowerCase(),
      }),
    )
    .digest("hex");
}

app.use(cors());
app.use(express.json({ limit: "100kb" }));

app.post("/api/campaigns", async (request, response, next) => {
  const parsedBody = createCampaignSchema.safeParse(request.body);

  if (!parsedBody.success) {
    return response.status(400).json({
      error: "Dados inválidos.",
      details: z.treeifyError(parsedBody.error),
    });
  }

  const campaignInput = {
    ...parsedBody.data,
    recipientEmail: parsedBody.data.recipientEmail.toLowerCase(),
  };
  const idempotencyKey = createIdempotencyKey(campaignInput);

  try {
    const activeCampaign = await prisma.campaign.findFirst({
      where: {
        idempotencyKey,
        status: { in: [CampaignStatus.PENDING, CampaignStatus.PROCESSING] },
      },
    });

    if (activeCampaign) {
      return response.status(409).json({
        error: "Já existe uma campanha idêntica aguardando envio.",
        campaign: activeCampaign,
      });
    }

    const campaign = await prisma.campaign.create({
      data: { ...campaignInput, idempotencyKey },
    });

    enqueueCampaign(campaign.id);
    return response.status(202).json({ campaign });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const campaign = await prisma.campaign.findFirst({
        where: {
          idempotencyKey,
          status: { in: [CampaignStatus.PENDING, CampaignStatus.PROCESSING] },
        },
      });

      return response.status(409).json({
        error: "Já existe uma campanha idêntica aguardando envio.",
        campaign,
      });
    }

    return next(error);
  }
});

app.get("/api/campaigns", async (_request, response, next) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      orderBy: { createdAt: "desc" },
    });

    return response.json({ campaigns });
  } catch (error) {
    return next(error);
  }
});

app.use(
  (
    error: unknown,
    _request: express.Request,
    response: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(error);
    response.status(500).json({ error: "Erro interno do servidor." });
  },
);

async function start() {
  await prisma.$connect();
  await resumePendingCampaigns();

  app.listen(port, () => {
    console.log(`API disponível em http://localhost:${port}`);
  });
}

void start();
