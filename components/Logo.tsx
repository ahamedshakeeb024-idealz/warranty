interface LogoProps {
  height?: number
  chip?: boolean // white pill behind the logo so it shows on dark bars
}

export default function Logo({ height = 28, chip = false }: LogoProps) {
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt="iDealz"
      style={{ height, width: 'auto', display: 'block' }}
    />
  )
  if (!chip) return img
  return (
    <span
      className="inline-flex items-center rounded-xl px-2.5 py-1.5"
      style={{ background: '#ffffff' }}
    >
      {img}
    </span>
  )
}
