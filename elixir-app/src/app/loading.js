export default function Loading() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-[color:var(--background)] text-[color:var(--foreground)]"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="relative mb-6 h-16 w-16">
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-solid border-[color:var(--primary-light)] border-t-transparent"></div>
        <div className="absolute inset-3 rounded-full bg-[color:var(--background)]"></div>
      </div>
      <p className="text-lg font-medium text-[color:var(--primary-dark)]">
        กำลังโหลดข้อมูล...
      </p>
      <p className="mt-2 max-w-sm text-center text-sm text-neutral-500">
        กรุณารอสักครู่
      </p>
    </div>
  );
}
