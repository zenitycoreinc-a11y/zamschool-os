import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { applyRateLimit, getClientIp } from "@/lib/server-guards";
import { parseStudentPaymentInput } from "@/lib/payment-input";
import { requirePaymentsContext } from "@/lib/server-auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const access = await requirePaymentsContext(request);
    if (!access.ok) return access.response;
    const { schoolId, userId } = access.context;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // paid, pending, overdue
    const search = String(searchParams.get("search") || "").trim().toLowerCase().slice(0, 80);

    // Get students with their payment summaries
    let query = supabaseAdmin
      .from("payment_summaries")
      .select("*")
      .eq("school_id", schoolId);

    // Apply status filter
    if (status) {
      switch (status) {
        case "paid":
          query = query.eq("pending_amount", 0);
          break;
        case "pending":
          query = query.gt("pending_amount", 0);
          break;
        // TODO: Add overdue logic when due dates are implemented
      }
    }

    const { data: students, error: studentsError } = await query
      .order("first_name");

    if (studentsError) {
      console.error("Error fetching student payments:", studentsError);
      return NextResponse.json({ error: "Failed to fetch student payments" }, { status: 500 });
    }

    // Get additional student details
    const studentIds = (students || []).map(s => s.student_id);
    const { data: studentDetails } = studentIds.length > 0
      ? await supabaseAdmin
          .from("profiles")
          .select("id, phone, parent_email")
          .in("id", studentIds)
      : { data: [] };

    const studentDetailsMap = Object.fromEntries(
      (studentDetails || []).map(detail => [detail.id, detail])
    );

    // Process students with additional info
    let processedStudents = (students || []).map(student => ({
      ...student,
      phone: studentDetailsMap[student.student_id]?.phone || null,
      parentEmail: studentDetailsMap[student.student_id]?.parent_email || null,
      paymentStatus: student.pending_amount > 0 ? "pending" : "paid",
    }));

    if (search) {
      processedStudents = processedStudents.filter((student) =>
        [student.first_name, student.last_name, student.email].some((value) =>
          String(value || "").toLowerCase().includes(search)
        )
      );
    }

    // Calculate summary statistics
    const totalStudents = processedStudents.length;
    const paidStudents = processedStudents.filter(s => s.pending_amount === 0).length;
    const pendingStudents = processedStudents.filter(s => s.pending_amount > 0).length;
    const totalPendingAmount = processedStudents.reduce((sum, s) => sum + s.pending_amount, 0);
    const totalPaidAmount = processedStudents.reduce((sum, s) => sum + s.paid_amount, 0);

    return NextResponse.json({
      data: processedStudents,
      summary: {
        totalStudents,
        paidStudents,
        pendingStudents,
        totalPendingAmount,
        totalPaidAmount,
      }
    });
  } catch (error) {
    console.error("Error in payments students GET:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requirePaymentsContext(request);
    if (!access.ok) return access.response;
    const { schoolId, userId } = access.context;

    const ip = getClientIp(request);
    const rate = await applyRateLimit({
      key: `payments-students:${userId}:${ip}`,
      limit: 30,
      windowMs: 60_000,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        {
          status: 429,
          headers: { "Retry-After": String(rate.retryAfterSec) },
        }
      );
    }

    const {
      studentId,
      amount,
      paymentType,
      paymentMethod,
      referenceNumber,
    } = parseStudentPaymentInput(await request.json());

    // Verify student belongs to the same school
    const { data: studentCheck, error: studentError } = await supabaseAdmin
      .from("profiles")
      .select("id, school_id")
      .eq("id", studentId)
      .eq("role", "student")
      .eq("school_id", schoolId)
      .single();

    if (studentError || !studentCheck) {
      return NextResponse.json({ error: "Student not found or access denied" }, { status: 404 });
    }

    // Create payment record
    const { data: newPayment, error: paymentError } = await supabaseAdmin
      .from("payments")
      .insert({
        student_id: studentId,
        school_id: schoolId,
        amount,
        currency: "ZMW",
        payment_type: paymentType,
        payment_method: paymentMethod,
        reference_number: referenceNumber,
        status: "PAID",
        paid_at: new Date().toISOString(),
        created_by: userId,
      })
      .select()
      .single();

    if (paymentError) {
      console.error("Error creating payment:", paymentError);
      return NextResponse.json({ error: "Failed to process payment" }, { status: 500 });
    }

    return NextResponse.json({ data: newPayment }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid payment submission", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error in payments students POST:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
