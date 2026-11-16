export function LoadingStar() {
  return (
    <div className="relative">
      {/* Outer ring */}
      <div className="absolute inset-0 rounded-full border-4 border-muted animate-pulse"></div>

      {/* Spinning gradient ring */}
      <div className="relative h-20 w-20 animate-spin">
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary border-r-primary/60"></div>
      </div>

      {/* Inner pulsing star */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-10 w-10 animate-pulse">
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="text-yellow-500"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </div>
      </div>

      {/* Glow effect */}
      <div className="absolute inset-0 -z-10 rounded-full bg-primary/20 blur-xl animate-pulse"></div>
    </div>
  );
}
