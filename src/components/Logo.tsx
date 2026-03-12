import Link from "next/link";

/**
 * CashPulse brand logo — stylized "C" with a pulse/heartbeat line.
 * Use <Logo /> in navbars & footers for consistent branding.
 */

function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <div
      className="rounded-lg bg-[#00e87b] flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <svg
        width={size * 0.6}
        height={size * 0.6}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Stylized C */}
        <path
          d="M17 7.5A7 7 0 1 0 17 16.5"
          stroke="black"
          strokeWidth="2.8"
          strokeLinecap="round"
        />
        {/* Pulse line through the C */}
        <path
          d="M9 12h3l1.5-3 2 6 1.5-3H20"
          stroke="black"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function Logo({
  size = 32,
  textClass = "text-lg font-bold tracking-tight",
  href = "/",
  linked = true,
}: {
  size?: number;
  textClass?: string;
  href?: string;
  linked?: boolean;
}) {
  const inner = (
    <>
      <LogoMark size={size} />
      <span className={textClass}>CashPulse</span>
    </>
  );

  if (!linked) {
    return <div className="flex items-center gap-2">{inner}</div>;
  }

  return (
    <Link href={href} className="flex items-center gap-2">
      {inner}
    </Link>
  );
}

export { LogoMark };
export default Logo;
