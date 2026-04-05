"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Search, MessageSquare, Bell, LogOut, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getDisplayName } from "@/lib/profile-utils";

export default function Navbar() {
  const [profile, setProfile] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("id, role, email, avatar_url, first_name, last_name, schools(name)")
          .eq("id", user.id)
          .single();
        setProfile(data);
      }
    };
    fetchProfile();
  }, []);

  const displayName = getDisplayName(profile);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm mx-4 mt-4">
      {/* SEARCH BAR */}
      <div className="hidden md:flex items-center gap-2 text-xs rounded-full ring-[1.5px] ring-slate-200 px-4 bg-slate-50">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search..."
          className="w-[200px] p-2 bg-transparent outline-none text-slate-600"
        />
      </div>
      
      {/* ICONS AND USER */}
      <div className="flex items-center gap-6 justify-end w-full">
        <div className="flex items-center gap-4 border-r border-slate-100 pr-6">
          <div className="bg-slate-50 rounded-full w-9 h-9 flex items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors">
            <MessageSquare className="w-5 h-5 text-slate-500" />
          </div>
          <div className="bg-slate-50 rounded-full w-9 h-9 flex items-center justify-center cursor-pointer relative hover:bg-slate-100 transition-colors">
            <Bell className="w-5 h-5 text-slate-500" />
            <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col text-right">
            <span className="text-sm font-bold text-slate-700">{displayName}</span>
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
              {profile?.role || "User"} • {profile?.schools?.name || "School"}
            </span>
          </div>
          <div className="group relative">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-slate-100 cursor-pointer">
              {profile?.avatar_url ? (
                <Image 
                  src={profile.avatar_url} 
                  alt="Avatar" 
                  width={40} 
                  height={40} 
                  className="object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-lamaSky flex items-center justify-center text-white font-bold">
                  {displayName.charAt(0) || "U"}
                </div>
              )}
            </div>
            
            {/* DROPDOWN */}
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <button className="w-full px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2">
                <UserIcon className="w-4 h-4" /> Profile Settings
              </button>
              <button 
                onClick={handleLogout}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
