import UserCard from "@/components/UserCard";
import CountChart from "@/components/CountChart";
import AttendanceChart from "@/components/AttendanceChart";
import FinanceChart from "@/components/FinanceChart";
import EventCalendar from "@/components/EventCalendar";
import Announcements from "@/components/Announcements";

export default function AdminDashboard() {
  return (
    <div className="flex flex-col gap-6 py-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <UserCard type="admin" />
        <UserCard type="teacher" />
        <UserCard type="student" />
        <UserCard type="parent" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
            <div className="h-[390px]">
              <CountChart />
            </div>
            <div className="h-[390px]">
              <AttendanceChart />
            </div>
          </div>

          <div className="h-[430px]">
            <FinanceChart />
          </div>

          <Announcements />
        </div>

        <div className="min-w-0">
          <EventCalendar />
        </div>
      </div>
    </div>
  );
}
