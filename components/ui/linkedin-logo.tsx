export function LinkedInLogo({ size = 22 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="LinkedIn" className="linkedinIcon"><rect x="2" y="2" width="20" height="20" rx="3" fill="#0a66c2"/><circle cx="7.1" cy="7.1" r="1.3" fill="#fff"/><path fill="#fff" d="M5.9 9.5h2.4v8.6H5.9zm4 0h2.3v1.2c.5-.9 1.4-1.4 2.6-1.4 2.4 0 3.3 1.5 3.3 3.8v5h-2.4v-4.7c0-1.3-.3-2-1.5-2-1.3 0-1.9.9-1.9 2.3v4.4H9.9z"/></svg>;
}
