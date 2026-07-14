import { createHmac, timingSafeEqual } from "node:crypto";
import { getCurrentUser, grantEnrollment } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Verifies a completed Razorpay checkout and grants course access.
 * This is the only place enrollment for a paid course is written — the
 * Razorpay Checkout `handler` callback (client) calls this right after
 * payment, passing back the order/payment ids and signature Razorpay gave it.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Sign in required" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
  };
  const orderId = body.razorpay_order_id;
  if (!orderId) return Response.json({ error: "Missing order id" }, { status: 400 });

  const payment = await prisma.payment.findUnique({ where: { orderId } });
  if (!payment || payment.userId !== user.id) {
    return Response.json({ error: "Unknown order" }, { status: 400 });
  }
  if (payment.status === "paid") {
    return Response.json({ ok: true }); // already verified, idempotent
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (keySecret) {
    const paymentId = body.razorpay_payment_id;
    const signature = body.razorpay_signature;
    if (!paymentId || !signature) {
      return Response.json({ error: "Missing payment signature" }, { status: 400 });
    }
    const expected = createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");
    const expectedBuf = Buffer.from(expected, "hex");
    const signatureBuf = Buffer.from(signature, "hex");
    const valid =
      expectedBuf.length === signatureBuf.length && timingSafeEqual(expectedBuf, signatureBuf);
    if (!valid) return Response.json({ error: "Invalid payment signature" }, { status: 400 });

    await prisma.payment.update({ where: { orderId }, data: { status: "paid", paymentId } });
  } else {
    // Demo mode (no Razorpay keys configured): trust the client-simulated payment.
    await prisma.payment.update({ where: { orderId }, data: { status: "paid" } });
  }

  await grantEnrollment(user.id, payment.courseId);
  return Response.json({ ok: true });
}
