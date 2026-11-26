import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="container notfound">
      <h1>Page introuvable</h1>
      <p>L&apos;article ou la rubrique que vous cherchez n&apos;existe pas ou a été retiré.</p>
      <Link href="/" className="btn">
        Retour à l&apos;accueil
      </Link>
    </div>
  )
}
