import { PaymentType, Prisma } from "@prisma/client";
import Stripe from "stripe";
import { v4 as uuidv4 } from "uuid";

import { STRIPE_PUBLIC_KEY } from "@calcom/lib/constants";
import { getErrorFromUnknown } from "@calcom/lib/errors";
import prisma from "@calcom/prisma";
import { createPaymentLink } from "@calcom/stripe/client";
import stripe, { PaymentData } from "@calcom/stripe/server";
import { CalendarEvent } from "@calcom/types/Calendar";

import { sendAwaitingPaymentEmail, sendOrganizerPaymentRefundFailedEmail } from "@lib/emails/email-manager";

export type PaymentInfo = {
  link?: string | null;
  reason?: string | null;
  id?: string | null;
};

export async function handlePayment(
  evt: CalendarEvent,
  selectedEventType: {
    price: number;
    currency: string;
  },
  booking: {
    user: { email: string | null; name: string | null; timeZone: string } | null;
    id: number;
    startTime: { toISOString: () => string };
    uid: string;
  }
) {
  const stripe_publishable_key = STRIPE_PUBLIC_KEY!;

  const params: Stripe.PaymentIntentCreateParams = {
    amount: selectedEventType.price,
    currency: selectedEventType.currency,
    payment_method_types: ["card"],
    description: evt.title,
  };

  const paymentIntent = await stripe.paymentIntents.create(params);

  const payment = await prisma.payment.create({
    data: {
      type: PaymentType.STRIPE,
      uid: uuidv4(),
      booking: {
        connect: {
          id: booking.id,
        },
      },
      amount: selectedEventType.price,
      fee: 0,
      currency: selectedEventType.currency,
      success: false,
      refunded: false,
      data: Object.assign({}, paymentIntent, {
        stripe_publishable_key,
      }) /* We should treat this */ as PaymentData /* but Prisma doesn't know how to handle it, so it we treat it */ as unknown /* and then */ as Prisma.InputJsonValue,
      externalId: paymentIntent.id,
    },
  });

  await sendAwaitingPaymentEmail({
    ...evt,
    paymentInfo: {
      link: createPaymentLink({
        paymentUid: payment.uid,
        name: booking.user?.name,
        date: booking.startTime.toISOString(),
      }),
    },
  });

  return payment;
}

export async function refund(
  booking: {
    id: number;
    uid: string;
    startTime: Date;
    payment: {
      id: number;
      success: boolean;
      refunded: boolean;
      externalId: string;
      data: Prisma.JsonValue;
      type: PaymentType;
    }[];
  },
  calEvent: CalendarEvent
) {
  try {
    const payment = booking.payment.find((e) => e.success && !e.refunded);
    if (!payment) return;

    if (payment.type !== PaymentType.STRIPE) {
      await handleRefundError({
        event: calEvent,
        reason: "cannot refund non Stripe payment",
        paymentId: "unknown",
      });
      return;
    }

    const refund = await stripe.refunds.create(
      {
        payment_intent: payment.externalId,
      },
      { stripeAccount: (payment.data as unknown as PaymentData)["stripeAccount"] }
    );

    if (!refund || refund.status === "failed") {
      await handleRefundError({
        event: calEvent,
        reason: refund?.failure_reason || "unknown",
        paymentId: payment.externalId,
      });
      return;
    }

    await prisma.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        refunded: true,
      },
    });
  } catch (e) {
    const err = getErrorFromUnknown(e);
    console.error(err, "Refund failed");
    await handleRefundError({
      event: calEvent,
      reason: err.message || "unknown",
      paymentId: "unknown",
    });
  }
}

async function handleRefundError(opts: { event: CalendarEvent; reason: string; paymentId: string }) {
  console.error(`refund failed: ${opts.reason} for booking '${opts.event.uid}'`);
  await sendOrganizerPaymentRefundFailedEmail({
    ...opts.event,
    paymentInfo: { reason: opts.reason, id: opts.paymentId },
  });
}
