"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { DollarSign, TrendingUp, Users, AlertCircle, CreditCard, FileBarChart2, Calendar, CheckCircle } from "lucide-react";
import { format } from "date-fns";

export default function PaymentsDashboard() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    pendingPayments: 0,
    overduePayments: 0,
    totalStudents: 0,
    monthlyRevenue: 0,
    pendingCount: 0,
  });
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [overdueStudents, setOverdueStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get school_id from user profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("school_id")
          .eq("id", user.id)
          .single();

        if (!profile?.school_id) return;

        // Load payment statistics
        const { data: payments } = await supabase
          .from("payments")
          .select("amount, status, created_at, student_id")
          .eq("school_id", profile.school_id);

        const totalRevenue = payments?.filter(p => p.status === 'PAID').reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
        const pendingPayments = payments?.filter(p => p.status === 'PENDING').reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
        const pendingCount = payments?.filter(p => p.status === 'PENDING').length || 0;

        // Calculate monthly revenue (current month)
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthlyRevenue = payments?.filter(p => {
          const paymentDate = new Date(p.created_at);
          return p.status === 'PAID' && 
                 paymentDate.getMonth() === currentMonth && 
                 paymentDate.getFullYear() === currentYear;
        }).reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

        // Get student count
        const { count: studentCount } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("school_id", profile.school_id)
          .eq("role", "student");

        setStats({
          totalRevenue,
          pendingPayments,
          overduePayments: 0, // TODO: Calculate based on due dates
          totalStudents: studentCount || 0,
          monthlyRevenue,
          pendingCount,
        });

        // Get recent payments
        const { data: recentPaymentsData } = await supabase
          .from("payments")
          .select(`
            id,
            amount,
            status,
            payment_type,
            created_at,
            paid_at,
            profiles!inner(first_name, last_name, email)
          `)
          .eq("school_id", profile.school_id)
          .order("created_at", { ascending: false })
          .limit(10);

        setRecentPayments(recentPaymentsData || []);

        // Get students with overdue payments (mock data for now)
        setOverdueStudents([
          { id: 1, name: "John Doe", email: "john@example.com", amount: 2500, daysOverdue: 15 },
          { id: 2, name: "Jane Smith", email: "jane@example.com", amount: 1800, daysOverdue: 8 },
          { id: 3, name: "Bob Johnson", email: "bob@example.com", amount: 3200, daysOverdue: 22 },
        ]);

      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const StatCard = ({ title, value, icon: Icon, color, trend, subtitle }: any) => (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {title.includes("Amount") || title.includes("Revenue") ? `ZMW ${value.toLocaleString()}` : value}
          </p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
          {trend !== undefined && (
            <p className={`text-xs mt-2 ${trend > 0 ? "text-green-600" : "text-red-600"}`}>
              {trend > 0 ? "+" : ""}{trend}% from last month
            </p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex-1 p-4 flex items-center justify-center">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Total Revenue"
          value={stats.totalRevenue}
          icon={DollarSign}
          color="bg-green-500"
          trend={12}
        />
        <StatCard
          title="Pending Amount"
          value={stats.pendingPayments}
          icon={AlertCircle}
          color="bg-orange-500"
          trend={-5}
        />
        <StatCard
          title="Monthly Revenue"
          value={stats.monthlyRevenue}
          icon={TrendingUp}
          color="bg-blue-500"
          trend={8}
        />
        <StatCard
          title="Total Students"
          value={stats.totalStudents}
          icon={Users}
          color="bg-purple-500"
          subtitle="Active students"
        />
        <StatCard
          title="Pending Payments"
          value={stats.pendingCount}
          icon={CreditCard}
          color="bg-yellow-500"
          subtitle="Awaiting payment"
        />
        <StatCard
          title="Overdue"
          value={stats.overduePayments}
          icon={FileBarChart2}
          color="bg-red-500"
          subtitle="Need attention"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Payments */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Payments</h2>
              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                View All
              </button>
            </div>
            <div className="space-y-3">
              {recentPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      payment.status === 'PAID' ? 'bg-green-100' : 'bg-yellow-100'
                    }`}>
                      {payment.status === 'PAID' ? 
                        <CheckCircle className="w-4 h-4 text-green-600" /> :
                        <AlertCircle className="w-4 h-4 text-yellow-600" />
                      }
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        {payment.profiles.first_name} {payment.profiles.last_name}
                      </p>
                      <p className="text-xs text-gray-500">{payment.payment_type || "School Fee"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">ZMW {payment.amount.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(payment.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Overdue Students */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Overdue Students</h2>
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
            <div className="space-y-3">
              {overdueStudents.map((student) => (
                <div key={student.id} className="p-3 bg-red-50 rounded-lg border border-red-100">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-gray-900 text-sm">{student.name}</p>
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                      {student.daysOverdue} days
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">{student.email}</p>
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-red-600">ZMW {student.amount.toLocaleString()}</p>
                    <button className="text-xs text-red-600 hover:text-red-700 font-medium">
                      Send Reminder
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center">
            <CreditCard className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Process Payment</p>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center">
            <FileBarChart2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Generate Report</p>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center">
            <AlertCircle className="w-8 h-8 text-orange-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Send Reminders</p>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center">
            <Calendar className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">View Calendar</p>
          </button>
        </div>
      </div>
    </div>
  );
}
