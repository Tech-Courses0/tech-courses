import { randomBytes } from "node:crypto";
import Razorpay from "razorpay";
import { getCourseById } from "@/lib/catalog";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Creates a Razorpay order for a paid course. Falls back to a mock order
 * (no real charge) when RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET aren't set, so
 * checkout works locally with no secrets configured.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Sign in required" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { courseId?: string };
  const course = body.courseId ? await getCourseById(body.courseId) : undefined;
  if (!course) return Response.json({ error: "Unknown course" }, { status: 400 });
  if (course.priceInr <= 0) {
    return Response.json({ error: "This course is free — use the enroll button instead." }, { status: 400 });
  }

  const gst = Math.round(course.priceInr * 0.18);
  const total = course.priceInr + gst;
  const amountPaise = total * 100;

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  // Razorpay caps receipt at 40 chars — course.id (YouTube playlist id) alone
  // can blow past that, so use an opaque short id instead of a composite key.
  const receipt = randomBytes(12).toString("hex");

  let orderId: string;
  let mock = false;
  if (keyId && keySecret) {
    const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const order = await rzp.orders.create({ amount: amountPaise, currency: "INR", receipt });
    orderId = order.id;
  } else {
    mock = true;
    orderId = `order_demo_${receipt}`;
  }

  await prisma.payment.create({
    data: { userId: user.id, courseId: course.id, orderId, amountPaise, status: "created" },
  });

  return Response.json({
    mock,
    orderId,
    keyId: keyId ?? "rzp_test_demo",
    currency: "INR",
    amountPaise,
    breakdown: { base: course.priceInr, gst, total },
  });
}
