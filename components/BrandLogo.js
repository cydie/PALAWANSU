export function RizalLogo({ className = '', size = 48, alt = 'Palawan State University – Rizal Campus' }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/rizal-campus-logo.png"
      alt={alt}
      width={size}
      height={size}
      className={`brand-logo ${className}`.trim()}
      style={{ width: size, height: size }}
    />
  );
}

export function PsuSeal({ className = '', size = 120, alt = 'Palawan State University' }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/psu-seal.png"
      alt={alt}
      width={size}
      height={size}
      className={`psu-seal ${className}`.trim()}
      style={{ width: size, height: size }}
    />
  );
}

export function SchoolLetterhead({
  title,
  subtitle,
  meta = [],
}) {
  return (
    <header className="school-letterhead">
      <div className="school-letterhead-inner">
        <RizalLogo size={72} className="letterhead-logo" />
        <div className="school-letterhead-text">
          <div className="school-letterhead-uni">Republic of the Philippines</div>
          <div className="school-letterhead-name">Palawan State University</div>
          <div className="school-letterhead-campus">Rizal Campus · Office of the Registrar</div>
          <div className="school-letterhead-title">{title}</div>
          {subtitle ? <div className="school-letterhead-sub">{subtitle}</div> : null}
          {meta.length ? (
            <div className="school-letterhead-meta">
              {meta.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          ) : null}
        </div>
        <PsuSeal size={72} className="letterhead-seal" />
      </div>
    </header>
  );
}
