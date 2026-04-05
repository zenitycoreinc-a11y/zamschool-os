"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Loader2, AlertCircle, Building2, MapPin, Phone, Mail, User, Hash, Eye, EyeOff, Lock } from "lucide-react";

// Zambian Provinces
const ZAMBIAN_PROVINCES = [
  "Central",
  "Copperbelt", 
  "Eastern",
  "Luapula",
  "Lusaka",
  "Muchinga",
  "Northern",
  "North-Western",
  "Southern",
  "Western"
];

// Districts by Province
const ZAMBIAN_DISTRICTS: Record<string, string[]> = {
  "Central": ["Chibombo", "Kabwe", "Kapiri Mposhi", "Mkushi", "Mumbwa", "Serenje", "Chisamba", "Itezhi-Tezhi", "Ngabwe"],
  "Copperbelt": ["Chililabombwe", "Chingola", "Kalulushi", "Kitwe", "Luanshya", "Lufwanyama", "Masaiti", "Mpongwe", "Mufulira", "Ndola"],
  "Eastern": ["Chadiza", "Chipata", "Katete", "Lundazi", "Mambwe", "Nyimba", "Petauke", "Sinda", "Vubwi", "Chipangali"],
  "Luapula": ["Chembe", "Chienge", "Kawambwa", "Lunga", "Mansa", "Milenge", "Mwansabombwe", "Mweru", "Nchelenge", "Samfya"],
  "Lusaka": ["Chilanga", "Chongwe", "Kafue", "Luangwa", "Lusaka", "Rufunsa", "Shibuyunji"],
  "Muchinga": ["Chama", "Chinsali", "Isoka", "Kanchibiya", "Lavushimanda", "Mafinga", "Mpika", "Nakonde", "Shiwang'andu"],
  "Northern": ["Chilubi", "Kaputa", "Kasama", "Lunte", "Luwingu", "Mbala", "Mporokoso", "Mpulungu", "Mungwi", "Nsama", "Senga"],
  "North-Western": ["Chavuma", "Ikelenge", "Kabompo", "Kasempa", "Manyinga", "Mufumbwe", "Mwinilunga", "Solwezi", "Zambezi"],
  "Southern": ["Chikankata", "Choma", "Gwembe", "Itezhi-Tezhi", "Kalomo", "Kazungula", "Livingstone", "Mazabuka", "Monze", "Namwala", "Pemba", "Siavonga", "Sinazongwe"],
  "Western": ["Kalabo", "Kaoma", "Limulunga", "Luampa", "Lukulu", "Mongu", "Mulobezi", "Mwandi", "Nalolo", "Nkeyema", "Senanga", "Sesheke", "Shang'ombo", "Sikongo"]
};
import { cn } from "@/lib/utils";

const registerSchema = z.object({
  adminName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone is required"),
  schoolName: z.string().min(2, "School name must be at least 2 characters"),
  schoolCode: z.string().min(4, "School code must be at least 4 characters"),
  address: z.string().min(1, "Address is required"),
  emisCode: z.string().min(1, "EMIS code is required"),
  province: z.string().min(1, "Province is required"),
  district: z.string().min(1, "District is required"),
  schoolType: z.string().min(1, "School type is required"),
  ownershipType: z.string().min(1, "Ownership type is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState("");
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setLoading(true);
    setError(null);

    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.adminName.split(" ").slice(0, -1).join(" ") || data.adminName,
            last_name: data.adminName.split(" ").slice(-1).join(" ") || "",
            role: "admin",
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create user");

      // 2. Register school
      const res = await fetch("/api/auth/register-school", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: authData.user.id,
          email: data.email,
          schoolName: data.schoolName,
          schoolCode: data.schoolCode,
          adminName: data.adminName,
          phone: data.phone,
          address: data.address,
          emisCode: data.emisCode,
          province: data.province,
          district: data.district,
          schoolType: data.schoolType,
          ownershipType: data.ownershipType,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Registration failed");

      // 3. Redirect to OTP verification instead of signing in
      router.replace(`/verify-email?email=${encodeURIComponent(data.email)}&userId=${authData.user.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 p-4">
      <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "34px 34px" }} />
      <div className="absolute -top-20 left-1/3 w-[520px] h-[520px] bg-sky-500/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-24 right-1/3 w-[460px] h-[460px] bg-violet-500/18 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-2xl rounded-3xl border border-white/15 bg-white/10 backdrop-blur-xl shadow-[0_32px_70px_rgba(2,6,23,0.5)] p-8 max-h-[90vh] overflow-y-auto">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-xl overflow-hidden shadow-md mb-3">
            <Image
              src="/icon.png"
              alt="ZamSchool OS"
              width={48}
              height={48}
              className="w-full h-full object-cover"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold text-white">Register Your School</h1>
          <p className="text-slate-300">Create your ZamSchool OS admin account</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-400/30 rounded-xl flex items-start gap-3 text-red-200 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {step === 1 ? (
            <>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1 flex items-center gap-2">
                    <User className="w-4 h-4" /> Admin Name
                  </label>
                  <input
                    {...register("adminName")}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl border border-white/20 bg-white/10 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-transparent transition-all",
                      errors.adminName && "border-red-500 focus:ring-red-500"
                    )}
                    placeholder="John Doe"
                  />
                  {errors.adminName && <p className="mt-1 text-xs text-red-400">{errors.adminName.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1 flex items-center gap-2">
                    <Mail className="w-4 h-4" /> Email
                  </label>
                  <input
                    {...register("email")}
                    type="email"
                    className={cn(
                      "w-full px-4 py-3 rounded-xl border border-white/20 bg-white/10 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-transparent transition-all",
                      errors.email && "border-red-500 focus:ring-red-500"
                    )}
                    placeholder="admin@school.com"
                  />
                  {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1 flex items-center gap-2">
                    <Phone className="w-4 h-4" /> Phone
                  </label>
                  <input
                    {...register("phone")}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl border border-white/20 bg-white/10 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-transparent transition-all",
                      errors.phone && "border-red-500 focus:ring-red-500"
                    )}
                    placeholder="+260..."
                  />
                  {errors.phone && <p className="mt-1 text-xs text-red-400">{errors.phone.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1 flex items-center gap-2">
                    <Lock className="w-4 h-4" /> Password
                  </label>
                  <div className="relative">
                    <input
                      {...register("password")}
                      type={showPassword ? "text" : "password"}
                      className={cn(
                        "w-full px-4 py-3 pr-12 rounded-xl border border-white/20 bg-white/10 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-transparent transition-all",
                        errors.password && "border-red-500 focus:ring-red-500"
                      )}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full bg-sky-500 text-white py-3 rounded-xl font-bold text-lg hover:bg-sky-400 transition-all shadow-lg shadow-sky-500/30"
              >
                Next: School Details
              </button>
            </>
          ) : (
            <>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1 flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> School Name
                  </label>
                  <input
                    {...register("schoolName")}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl border border-white/20 bg-white/10 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-transparent transition-all",
                      errors.schoolName && "border-red-500 focus:ring-red-500"
                    )}
                    placeholder="ABC Secondary School"
                  />
                  {errors.schoolName && <p className="mt-1 text-xs text-red-400">{errors.schoolName.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1 flex items-center gap-2">
                    <Hash className="w-4 h-4" /> School Code
                  </label>
                  <input
                    {...register("schoolCode")}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl border border-white/20 bg-white/10 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-transparent transition-all",
                      errors.schoolCode && "border-red-500 focus:ring-red-500"
                    )}
                    placeholder="ABC123"
                  />
                  {errors.schoolCode && <p className="mt-1 text-xs text-red-400">{errors.schoolCode.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1 flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Address
                  </label>
                  <input
                    {...register("address")}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl border border-white/20 bg-white/10 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-transparent transition-all",
                      errors.address && "border-red-500 focus:ring-red-500"
                    )}
                    placeholder="123 Main Street"
                  />
                  {errors.address && <p className="mt-1 text-xs text-red-400">{errors.address.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">EMIS Code</label>
                  <input
                    {...register("emisCode")}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl border border-white/20 bg-white/10 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-transparent transition-all",
                      errors.emisCode && "border-red-500 focus:ring-red-500"
                    )}
                    placeholder="EMIS-12345"
                  />
                  {errors.emisCode && <p className="mt-1 text-xs text-red-400">{errors.emisCode.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Province</label>
                  <select
                    {...register("province")}
                    onChange={(e) => {
                      register("province").onChange(e);
                      setSelectedProvince(e.target.value);
                    }}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl border border-white/20 bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-transparent transition-all",
                      errors.province && "border-red-500 focus:ring-red-500"
                    )}
                  >
                    <option value="" className="bg-slate-800">Select province...</option>
                    {ZAMBIAN_PROVINCES.map((province) => (
                      <option key={province} value={province} className="bg-slate-800">{province}</option>
                    ))}
                  </select>
                  {errors.province && <p className="mt-1 text-xs text-red-400">{errors.province.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">District</label>
                  <select
                    {...register("district")}
                    disabled={!selectedProvince}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl border border-white/20 bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-transparent transition-all disabled:opacity-50",
                      errors.district && "border-red-500 focus:ring-red-500"
                    )}
                  >
                    <option value="" className="bg-slate-800">
                      {selectedProvince ? "Select district..." : "Select province first..."}
                    </option>
                    {selectedProvince && ZAMBIAN_DISTRICTS[selectedProvince]?.map((district) => (
                      <option key={district} value={district} className="bg-slate-800">{district}</option>
                    ))}
                  </select>
                  {errors.district && <p className="mt-1 text-xs text-red-400">{errors.district.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">School Type</label>
                  <select
                    {...register("schoolType")}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl border border-white/20 bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-transparent transition-all",
                      errors.schoolType && "border-red-500 focus:ring-red-500"
                    )}
                  >
                    <option value="" className="bg-slate-800">Select type...</option>
                    <option value="Primary" className="bg-slate-800">Primary</option>
                    <option value="Secondary" className="bg-slate-800">Secondary</option>
                    <option value="High School" className="bg-slate-800">High School</option>
                  </select>
                  {errors.schoolType && <p className="mt-1 text-xs text-red-400">{errors.schoolType.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Ownership</label>
                  <select
                    {...register("ownershipType")}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl border border-white/20 bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-transparent transition-all",
                      errors.ownershipType && "border-red-500 focus:ring-red-500"
                    )}
                  >
                    <option value="" className="bg-slate-800">Select...</option>
                    <option value="Government" className="bg-slate-800">Government</option>
                    <option value="Private" className="bg-slate-800">Private</option>
                    <option value="Grant Aided" className="bg-slate-800">Grant Aided</option>
                  </select>
                  {errors.ownershipType && <p className="mt-1 text-xs text-red-400">{errors.ownershipType.message}</p>}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 rounded-xl border border-white/20 text-white font-medium hover:bg-white/10 transition-all"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-sky-500 text-white py-3 rounded-xl font-bold text-lg hover:bg-sky-400 transition-all flex items-center justify-center gap-2 disabled:opacity-70 shadow-lg shadow-sky-500/30"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Register School"
                  )}
                </button>
              </div>
            </>
          )}
        </form>

        <div className="mt-6 pt-6 border-t border-white/10 text-center">
          <p className="text-sm text-slate-300">
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-sky-300 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
