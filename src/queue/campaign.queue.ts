import { CampaignStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";

const SEND_DELAY_MS = 5_000;
const queuedCampaignIds = new Set<string>();
let isProcessing = false;

async function simulateEmailDelivery(recipientEmail: string) {
  await new Promise((resolve) => setTimeout(resolve, SEND_DELAY_MS));

  if (recipientEmail.endsWith("@invalid.test")) {
    throw new Error("O provedor de e-mail recusou o destinatário.");
  }
}

async function processNext() {
  if (isProcessing) return;

  const campaignId = queuedCampaignIds.values().next().value as string | undefined;
  if (!campaignId) return;

  isProcessing = true;
  queuedCampaignIds.delete(campaignId);

  try {
    const campaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: CampaignStatus.PROCESSING, errorMessage: null },
    });

    await simulateEmailDelivery(campaign.recipientEmail);

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: CampaignStatus.SENT },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Não foi possível enviar a campanha.";

    await prisma.campaign
      .update({
        where: { id: campaignId },
        data: { status: CampaignStatus.FAILED, errorMessage },
      })
      .catch(() => undefined);
  } finally {
    isProcessing = false;
    void processNext();
  }
}

export function enqueueCampaign(campaignId: string) {
  queuedCampaignIds.add(campaignId);
  void processNext();
}

export async function resumePendingCampaigns() {
  const pendingCampaigns = await prisma.campaign.findMany({
    where: { status: CampaignStatus.PENDING },
    select: { id: true },
  });

  pendingCampaigns.forEach(({ id }) => enqueueCampaign(id));
}
