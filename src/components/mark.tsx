/**
 * The parish medallion, redrawn for the interface.
 *
 * The real wordmark carries a square frame holding a quatrefoil cross with four
 * corner dots, which reads as carved stone. This keeps the square, the centre
 * and the four corners, and drops the detail that would turn to mud at 20px.
 * It also sets the shape language for the whole app: right angles, no rounding.
 */
export function Medallion({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
      className={className}
    >
      <rect x="1.6" y="1.6" width="20.8" height="20.8" strokeWidth="1.2" />
      <rect x="7.4" y="7.4" width="9.2" height="9.2" strokeWidth="1.2" />
      <rect x="10.6" y="10.6" width="2.8" height="2.8" fill="currentColor" stroke="none" />
      <rect x="4.15" y="4.15" width="1.6" height="1.6" fill="currentColor" stroke="none" />
      <rect x="18.25" y="4.15" width="1.6" height="1.6" fill="currentColor" stroke="none" />
      <rect x="4.15" y="18.25" width="1.6" height="1.6" fill="currentColor" stroke="none" />
      <rect x="18.25" y="18.25" width="1.6" height="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * The wordmark, set the way the parish sets it: serif given name, light sans
 * surname, one space between. Used in the spine and on the sign in screen.
 */
export function Wordmark({ size = "1.0625rem" }: { size?: string }) {
  return (
    <span className="flex items-baseline gap-[0.22em] leading-none" style={{ fontSize: size }}>
      <span className="serif font-medium">Saint</span>
      <span className="font-light tracking-[-0.01em]">Helen</span>
    </span>
  );
}
