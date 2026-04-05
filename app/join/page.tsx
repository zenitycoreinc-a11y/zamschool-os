import Link from "next/link";
import Image from "next/image";

export default function JoinSchoolPage() {
  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* LEFT PANEL */}
      <div className="hidden lg:flex w-1/2 bg-lamaSkyLight flex-col items-center justify-center p-12 text-center">
        <div className="w-20 h-20 rounded-full overflow-hidden mb-8 shadow-lg">
          <Image
            src="/icon.png"
            alt="ZamSchool OS"
            width={80}
            height={80}
            className="w-full h-full object-cover"
          />
        </div>
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          Join Your School
        </h1>
        <p className="text-gray-600 text-lg max-w-md">
          Enter your school code and student details to activate your account.
        </p>
        <div className="mt-12 relative w-full max-w-sm aspect-square">
          <Image
            src="https://picsum.photos/seed/join/800/800"
            alt="School Illustration"
            fill
            className="object-cover rounded-2xl shadow-xl"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <div className="lg:hidden w-12 h-12 rounded-full overflow-hidden mb-6 shadow-sm mx-auto">
            <Image
              src="/icon.png"
              alt="ZamSchool OS"
              width={48}
              height={48}
              className="w-full h-full object-cover"
            />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-3">
            Student Join
          </h2>
          <p className="text-sm text-gray-600 text-center mb-8">
            Self-service record matching is not live yet. Ask your school admin to invite you or use your existing account to sign in.
          </p>
          <form className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">
                School Code
              </label>
              <input
                type="text"
                className="p-3 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-lamaSky transition-all"
                placeholder="Enter school code"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">
                Student Number
              </label>
              <input
                type="text"
                className="p-3 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-lamaSky transition-all"
                placeholder="Enter student number"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">
                First Name
              </label>
              <input
                type="text"
                className="p-3 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-lamaSky transition-all"
                placeholder="Enter first name"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">
                Last Name
              </label>
              <input
                type="text"
                className="p-3 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-lamaSky transition-all"
                placeholder="Enter last name"
              />
            </div>
            <button
              type="button"
              disabled
              className="w-full bg-gray-300 text-gray-600 font-bold py-3 rounded-lg cursor-not-allowed shadow-sm mt-2"
            >
              Record matching coming soon
            </button>
            <Link
              href="/register"
              className="w-full inline-flex items-center justify-center bg-lamaSky text-white font-bold py-3 rounded-lg hover:bg-opacity-90 transition-all shadow-md"
            >
              Request access
            </Link>
          </form>
          <div className="mt-8 text-center text-sm text-gray-600 flex flex-col gap-2">
            <p>
              Already have an account?{" "}
              <Link href="/login" className="text-lamaSky font-medium hover:underline">
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
