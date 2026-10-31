import Link from "next/link";

export function CollectionView({ compact, fullHref, compactHref }: {
  compact: boolean;
  fullHref: string;
  compactHref: string;
}) {
  return <nav className="collectionView" aria-label="Visualização da coleção">
    <span>Visualização</span>
    <Link href={fullHref} aria-current={!compact ? "page" : undefined}>Completa</Link>
    <Link href={compactHref} aria-current={compact ? "page" : undefined}>Compacta</Link>
  </nav>;
}

export function CollectionPagination({ firstHref, nextHref, label }: {
  firstHref?: string;
  nextHref?: string;
  label: string;
}) {
  if (!firstHref && !nextHref) return null;
  return <nav className="pagination" aria-label={label}>
    {firstHref ? <Link href={firstHref}>Primeira página</Link> : <span />}
    {nextHref && <Link href={nextHref}>Próxima página</Link>}
  </nav>;
}
